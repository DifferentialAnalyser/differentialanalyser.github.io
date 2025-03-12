import { BUILTIN_VARIABLES, BUITLIN_FUNCTIONS } from "./builtins";
import { ParsedExpression } from "./ParsedExpression";
import { next_token, parse_expr, Token } from "./Parser";

/**
 * Expression namespace for expression related functions
 */
export default class Expression {
  /**
   * Evaluates an expression string in the context of a given environment
   *
   * @param expr The expression string to evaluate
   * @param [env={}] The map of identifiers to values that contains variables
   *   defined for the evaluation of the expression
   * @return The computed value of the expression
   * @throws Will throw an error if any variables used in the expression are undefined
   */
  static eval(expr: string, env: { [ident: string]: number } = {}): number {
    const [result, vars] = this.partial_eval_expr(this.parse(expr), env);

    if (result._type !== "lit") {
      throw new Error(`Referenced undefined variables: ${Array.from(vars).map(v => `'${v}'`).join(", ")}`);
    }

    return result.value
  }

  /**
   * Compiles an expression string to an AST and wraps it in a function to evaluate
   * the AST with a given environment
   *
   * @param expr The expression string to evaluate
   * @param [env={}] The map of identifiers to values that contains variables
   *   defined for the evaluation of the expression
   * @return A function taking an environment map as an argument return the value of the
   *   expression when evaluated in the given environment
   */
  static compile(expr: string, env: { [ident: string]: number } = {}): (env?: { [ident: string]: number }) => number {
    const result = this.compile_min(expr, env);
    return (typeof result === "number") ? _ => result : result;
  }

  /**
   * Compiles an expression string to an AST and wraps it in a function to evaluate
   * the AST with a given environment if there are any undefined variables, and a number
   * if the ntire expression can be evaluated with the information given.
   *
   * @param expr The expression string to evaluate
   * @param [env={}] The map of identifiers to values that contains variables
   *   defined for the evaluation of the expression
   * @return A function taking an environment map as an argument return the value of the
   *   expression when evaluated in the given environment or the evaluated value
   */
  static compile_min(expr: string, env: { [ident: string]: number } = {}): number | ((env?: { [ident: string]: number }) => number) {
    const parsed_expr = this.parse(expr);
    const [partial_expr, _] = this.partial_eval_expr(parsed_expr, env);

    // Check if the expression has been completely evaluated
    // and return a number if so
    if (partial_expr._type === "lit") {
      return partial_expr.value;
    }

    return (env: { [ident: string]: number } = {}) => {
      // Evaluate the partially evaluated expression with the new environment
      const [result, new_vars] = this.partial_eval_expr(partial_expr, env);
      if (result._type !== "lit") {
        throw new Error(`Referenced undefined variables: ${Array.from(new_vars).map(v => `'${v}'`).join(", ")}`);
      }

      return result.value
    };
  }

  /**
   * Partially evaulate an expression AST, evaluating any terms in the AST that only contain
   * defined constants. This function is not aware of any mathematical properties of operators
   * such as associativity of addition.
   *
   * @param expr The expression string to evaluate
   * @param [env={}] The map of identifiers to values that contains variables
   *   defined for the evaluation of the expression
   * @return A tuple of a partially evaluated expression, and a set of the identifiers of all undefined variables
   */
  static partial_eval_expr(expr: ParsedExpression, env: { [ident: string]: number } = {}): [ParsedExpression, Set<string>] {
    // Merge given environment with the builtin environment
    env = {
      ...BUILTIN_VARIABLES,
      ...env,
    };

    switch (expr._type) {
      // Binary operators
      case "+":
      case "-":
      case "/":
      case "*":
      case "%":
      case "^":
      case ">":
      case "<":
      case ">=":
      case "<=":
      case "==":
      case "!=":
        // Evaluate the expression on each side of the binary operator
        const [lhs, lhs_vars] = ("left" in expr)
          ? this.partial_eval_expr(expr.left, env)
          : [{ _type: "lit", value: 0 } as ParsedExpression, new Set<string>()];

        const [rhs, rhs_vars] = this.partial_eval_expr(expr.right, env);

        // If both sides successfully evaluated to a value
        if (lhs._type === "lit" && rhs._type === "lit") {
          // Return the computed value
          return [
            { _type: "lit", value: BUITLIN_FUNCTIONS[expr._type](lhs.value, rhs.value) },
            new Set([...lhs_vars, ...rhs_vars]),
          ]
        } else {
          // Return the new partially evalued expression, with the undefined
          // variables of each side merged.
          return [
            { _type: expr._type, left: lhs, right: rhs },
            new Set([...lhs_vars, ...rhs_vars]),
          ]
        }

      // Function
      case "fn":
        if (!(expr.ident in BUITLIN_FUNCTIONS)) {
          throw new Error(`Tried to call builtin function '${expr.ident}', but it does not exist.`);
        }
        const fn = BUITLIN_FUNCTIONS[expr.ident];
        if (fn.length !== expr.params.length) {
          throw new Error(`Tried to call builtin function '${expr.ident}', with ${expr.params.length} parameters, but it takes ${fn.length}`);
        }

        // Evaluate each parameter passed to the function
        const evaled_params = expr.params.map(expr => this.partial_eval_expr(expr, env));
        // Take the union accross the sets of all undefined variables in each parameter
        const vars = evaled_params.map(([_e, u]) => u).reduce((a, b) => new Set([...a, ...b]));
        const params = evaled_params.map(([e, _u]) => e);

        // If every parameter was successfully evaluated to a value
        if (params.every(e => e._type === "lit")) {
          // Return the evaluated expression
          return [
            { _type: "lit", value: fn(...params.map(e => e.value)) },
            vars
          ]
        } else {
          // Return the new partially evaluated expression
          return [
            { _type: "fn", ident: expr.ident, params },
            vars,
          ]
        }

      // sum and product terms
      case "sum":
      case "prod":
        // Get the start and end points
        const [start_expr, start_vars] = this.partial_eval_expr(expr.start, env);
        const [end_expr, end_vars] = this.partial_eval_expr(expr.end, env);

        // Partially evaluate the value expression with all the information we have so far.
        // This is to minimize the amount of processing required in each iteration of the
        // sum/product.
        const [value_expr, value_vars] = this.partial_eval_expr(expr.value, env);

        // Check that the only free variable in the now partially evaluated value expression is the
        // iteration variable.
        const value_ready = value_vars.has(expr.ident) && value_vars.size == 1 || value_expr._type === "lit";

        // If any of the 3 expressions are not ready to be evaluated
        if (start_expr._type !== "lit" || end_expr._type !== "lit" || !value_ready) {
          // Remove the iteration variable from the required variables of the value expression
          value_vars.delete(expr.ident)

          // Return the new partially evaluated expression
          return [

            { _type: expr._type, ident: expr.ident, start: start_expr, end: end_expr, value: value_expr },
            new Set([...start_vars, ...end_vars, ...value_vars])
          ];
        }
        const start = start_expr.value;
        const end = end_expr.value;

        // Only allow integer values as the start or end of the sum/product
        if (!Number.isInteger(start) || !Number.isInteger(end)) {
          throw new Error(`Non Integer value in range of ${expr._type === "sum" ? "summation" : "product"}`);
        }

        let step = start <= end ? 1 : -1;
        let result = expr._type === "sum" ? 0 : 1;

        // Evaluate each iteration of the sum/product and combine them as required
        for (let i = start; i != (end + step); i += step) {
          let [final_value_expr, _] = this.partial_eval_expr(value_expr, { [expr.ident]: i });
          if (final_value_expr._type !== "lit") {
            // We checked this was notr possible earlier, but you can never be too careful...
            throw new Error(`Failed to fully evaluate iteration of ${expr._type === "sum" ? "summation" : "product"}. This is a bug`);
          }
          const value = final_value_expr.value;
          result = expr._type === "sum" ? (result + value) : (result * value);
        }

        return [{ _type: "lit", value: result }, new Set()];

      // Let expression
      case "let": {
        // Evaluate the value to set the variable to
        const [value_expr, value_vars] = this.partial_eval_expr(expr.value, env);
        // If there is an undefined variables referenced
        if (value_expr._type !== "lit") {
          // Partially evaluate the expression to substitute the variable into
          const [cons, cons_vars] = this.partial_eval_expr(expr.cons, env);
          // Remove the variable of substitution from its set of required variables
          cons_vars.delete(expr.ident);
          // Return the new partially evaluated expression
          return [
            { _type: "let", ident: expr.ident, value: value_expr, cons },
            new Set([...value_vars, ...cons_vars]),
          ];
        }
        return this.partial_eval_expr(expr.cons, { ...env, [expr.ident]: value_expr.value });
      }
      // Variable
      case "var":
        // Check the variable is defined
        if (!(expr.ident in env)) {
          return [expr, new Set([expr.ident])];
        }
        // Substitute the variable into a literal
        return [{ _type: "lit", value: env[expr.ident] }, new Set()];
      // Literal/value
      case "lit":
        return [expr, new Set()];
    }
  }

  /**
    * Parse the given expression string to an AST
    *
    * @param expr An expression string
    * @return The parsed AST
    */
  static parse(expr: string): ParsedExpression {
    const tokens: Token[] = [];
    let token: Token | null = null;

    while ([token, expr] = next_token(expr), token) {
      tokens.push(token);
    }

    return parse_expr(tokens.reverse(), 0);
  }
}

