import { BinaryOperator, ParsedExpression as ParsedExpression, UnaryOperator } from "./ParsedExpression";

/**
 * Enum of all token types
 */
export enum TokenType {
  Ident = "ident",
  Literal = "lit",
  Sum = "sum",
  Prod = "prod",
  LBracket = "(",
  RBracket = ")",
  Comma = ",",
  Add = "+",
  Sub = "-",
  Mul = "*",
  Div = "/",
  Mod = "%",
  Pow = "^",
  Gt = ">",
  Lt = "<",
  GtEq = ">=",
  LtEq = "<=",
  Eq = "==",
  Neq = "!=",
  Assign = "=",
  SemiColon = ";",
}

/**
 * A token in the tokenized expression
 */
export type Token = {
  /**
   * The type of the token
   */
  _type: TokenType,

  /**
   * The string that represents the token in the original expression
   */
  span: string,
};

/**
 * Regex matching all punctuation
 */
const PUNCTUATION_REGEX = /^(>=|<=|!=|==|[+\-*/\^,.()><=%;])/;

/**
 * Regex matching integer and float literals
 */
const NUMBER_REGEX = /^[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/;

/**
 * Regex matching the sum and product keywords
 */
const SUM_PROD_REGEX = /^(sum|product)/;

/**
 * Regex matching identifiers
 */
const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*/;

/**
 * Consume the first token in the given string
 *
 * @param s The string to get a token from
 * @return A tuple of, the next token in the string, and the remaining string
 *   with the token removed
 */
export function next_token(s: string): [Token | null, string] {
  // Remove all whitespace from the beginning of the string
  s = s.trim();

  // A list of named tuple of a regex and a function to convert the regex
  // match to a token
  let regexes: { r: RegExp, _type: (match: string) => TokenType }[] = [
    { r: PUNCTUATION_REGEX, _type: match => match as TokenType, },
    { r: NUMBER_REGEX, _type: _ => TokenType.Literal },
    { r: SUM_PROD_REGEX, _type: (match: string) => match.slice(0, Math.min(match.length, 4)) as TokenType },
    { r: IDENTIFIER_REGEX, _type: _ => TokenType.Ident },
  ]

  // Test the string against each regex, returning the first match transformed to a token
  for (let { r, _type } of regexes) {
    const result = s.match(r);
    const span = result?.[0];
    if (span !== undefined) {
      return [
        { _type: _type(span), span },
        s.slice(span.length),
      ];
    }
  }

  // There is no valid token in the string
  return [null, s];
}

/**
 * A pratt parser to convert a reversed list of tokens to an expression AST.
 *
 * @param tokens A reversed list of tokens (next token is the last element) representing the expression
 * @param min_binding_power The minimum binding to allow (set this to 0 unless you know what you are doing)
 *
 * @see (@link https://matklad.github.io/2020/04/13/simple-but-powerful-pratt-parsing.html)
 *   A great blog post describing Pratt Parsers, on which this implementation is based.
 */
export function parse_expr(tokens: Token[], min_binding_power: number): ParsedExpression {
  // Get the next term
  let lhs = parse_term(tokens);
  
  outer_loop: while (true) {
    let operator = tokens[tokens.length - 1];
    // No tokens left
    if (operator === undefined) {
      break;
    }

    // Switch against the next token
    let error = false;
    switch (operator._type) {
      // Binary operator
      case TokenType.Add:
      case TokenType.Sub:
      case TokenType.Mul:
      case TokenType.Div:
      case TokenType.Pow:
      case TokenType.GtEq:
      case TokenType.LtEq:
      case TokenType.Gt:
      case TokenType.Lt:
      case TokenType.Eq:
      case TokenType.Neq:
      case TokenType.Mod:
        break;

      // End of a bracketed expression or part of a parameter list
      case TokenType.RBracket:
      case TokenType.Comma:
      case TokenType.SemiColon:
        // Break out of the loop (not just the switch statement)
        break outer_loop;

      // Implicit multiplication
      // : <lit>(<expr>)
      // : <lit> <ident>
      case TokenType.Ident:
      case TokenType.LBracket: {
        if (lhs._type === "var") {
          error = true;
          break;
        }
        let rhs = parse_term(tokens);
        lhs = { _type: "*", left: lhs, right: rhs };
      }
        // Go to the next iteration of the loop
        continue;

      // No other tokens are allowed here
      default:
        error = true ;
        break;
    }

    if (error) {
      throw new Error(`Unexpected token '${operator.span}' of type ${operator._type}`);
    }

    let [left_binding_power, right_binding_power] = infix_binding_power(operator._type as BinaryOperator);
    // Check we can bind to this already parsed term
    // If not we return
    if (left_binding_power < min_binding_power) {
      break;
    }

    // We can bind so we need a right hand side for the binary expression
    tokens.pop();
    let rhs = parse_expr(tokens, right_binding_power);

    lhs = {
      _type: operator._type as BinaryOperator,
      left: lhs,
      right: rhs,
    }
  }

  return lhs;
}

/**
 * Parse a term from the token list
 *
 * @param tokens A reversed list of tokens (next token is the last element) representing the expression
 * @return The parsed next term in the expression
 */
export function parse_term(tokens: Token[]): ParsedExpression {
  // Get the next token
  let lhs_tk = tokens.pop();

  // If there are no tokens left, this is an empty expression and we should error
  if (lhs_tk === undefined) {
    throw new Error("Empty expression encountered");
  }

  let lhs: ParsedExpression;

  // Use a swictch label as there is a nested switch
  outer_switch: switch (lhs_tk._type) {
    // Variable, Substitution or Function
    case TokenType.Ident: {
      // Get the next token without consuming it
      let peeked_tk = tokens[tokens.length - 1];
      switch (peeked_tk?._type) {
        // Function
        // : <ident>(<param_0>, <param_1>, ...)
        case TokenType.LBracket:
          tokens.pop();

          // Parse the parameters of the function
          const params: ParsedExpression[] = [];
          outer_loop: while (true) {
            // Parse the next parameter
            let expr = parse_expr(tokens, 0);
            params.push(expr);

            let popped_tk = tokens.pop();
            // The parameter list's left bracket should be closed
            if (popped_tk === undefined) {
              throw new Error("Unclosed left bracket");
            }
            switch (popped_tk._type) {
              // We want another parameter
              case ",":
                break;

              // The parameter list has ended
              case ")":
                break outer_loop;

              default:
                throw new Error(`Unexpected token '${popped_tk.span}' of type ${popped_tk._type}`);
            }
          }

          lhs = { _type: "fn", ident: lhs_tk.span, params };
          break;

        // Substitution
        // : <ident>=<substitute_expr>;<expr>
        case TokenType.Assign:
          tokens.pop();
          // Parse the expression to assign to the substitution variable
          const value = parse_expr(tokens, 0);

          // Allow a substitution with no expression to substitute into
          let tk = tokens.pop();
          if (tk === undefined) {
            lhs = {
              _type: "let",
              ident: lhs_tk.span,
              value,
              cons: { _type: "lit", value: 0 }
            };
            break;
          }
          // The expression to assign to the variable and the expression to
          // substitute into are separated by a semi-colon
          if (tk._type !== TokenType.SemiColon) {
            throw new Error(`Unexpected token '${tk.span}' of type ${tk._type}`);
          }
          if (tokens.length < 1) {
            lhs = {
              _type: "let",
              ident: lhs_tk.span,
              value,
              cons: { _type: "lit", value: 0 }
            };
            break;
          }
          // Parse the expression for the variable to be substituted into
          const cons = parse_expr(tokens, 0);
          lhs = { _type: "let", ident: lhs_tk.span, value, cons }
          break;

        // Must be a variable
        default:
          lhs = { _type: "var", ident: lhs_tk.span };
          break outer_switch;
      }
    } break;

    // Literal value
    case TokenType.Literal:
      lhs = { _type: "lit", value: Number.parseFloat(lhs_tk.span) }

      if (Number.isNaN(lhs.value)) {
        throw new Error(`Failed to parse number '${lhs.value}', this is a bug`);
      }
      break;

    // Bracketed expression
    // : (<expr>)
    case TokenType.LBracket:
      lhs = parse_expr(tokens, 0);

      // The bracketed expression must be closed
      let r_bracket = tokens.pop();
      if (r_bracket?._type !== TokenType.RBracket) {
        throw new Error("Unclosed left bracket");
      }
      break;

    // Summation and Product
    // : sum(<ident>=<start_expr>, <end_expr>, <iteration_expr>)
    // : prod(<ident>=<start_expr>, <end_expr>, <iteration_expr>)
    case TokenType.Sum:
    case TokenType.Prod: {
      // Allow variables named 'sum' or 'prod'
      let peeked_tk = tokens[tokens.length - 1];
      if (peeked_tk === undefined || peeked_tk._type !== TokenType.LBracket) {
        lhs = { _type: "var", ident: lhs_tk.span };
        break;
      }
      tokens.pop();

      // Common code to check the next token is of a specific type
      const expect = (tt: TokenType): Token => {
        let tk = tokens.pop();
        if (tk === undefined) {
          throw new Error(`Unclosed left bracket`);
        }
        if (tk._type !== tt) {
          throw new Error(`Unexpected token '${tk.span}' of type ${tk._type}`);
        }

        return tk;
      }

      // Parse the identifier for the iteration variable
      let ident_tk = expect(TokenType.Ident);
      expect(TokenType.Assign);
      // Parse the expression for the starting point
      let start = parse_expr(tokens, 0);
      expect(TokenType.Comma);
      // Parse the expression for the ending point
      let end = parse_expr(tokens, 0);
      expect(TokenType.Comma);
      // Parse the expression to evaluate each iteration
      let value = parse_expr(tokens, 0);
      expect(TokenType.RBracket);

      lhs = { _type: lhs_tk._type, ident: ident_tk.span, start, end, value }
    } break;

    // Unary operators
    case TokenType.Add:
    case TokenType.Sub:
      // Get the binding power of the unary operator
      let right_binding_power = prefix_binding_power(lhs_tk._type);
      // Parse the expression to apply the unary operator to
      let rhs = parse_expr(tokens, right_binding_power);

      lhs = { _type: lhs_tk._type, right: rhs };
      break;
    default:
      throw new Error(`Unexpected token '${lhs_tk.span}'' of type ${lhs_tk._type}`);
  }

  return lhs;
}

/**
 * Get the binding power of a prefix unary operator
 *
 * @param op The operator to get the binding power of
 * @return The binding power of the supplied operator.
 *   As all the operators are right associative only one
 *   value is returned.
 */
function prefix_binding_power(op: UnaryOperator): number {
  // All right associative
  const PREFIX_BINDING_POWER: { [k: string]: number } = {
    "+": 5,
    "-": 5,
  };

  return PREFIX_BINDING_POWER[op];
}

/**
 * Get the binding power of a binary operator
 *
 * @param op The operator to get the binding power of
 * @return A tuple of the left and right binding power of the supplied operator.
 *   If the left binding power is greater than that of the right, the operator is
 *   right associative, and it is left associative if the left is less than the right.
 *   The values are never equal.
 */
function infix_binding_power(op: BinaryOperator): [number, number] {
    // left < right -> left associative
    // left > right -> right associative
  const INFIX_BINDING_POWER: { [k: string]: [number, number] } = {
    "<": [0, 1],
    ">": [0, 1],
    "<=": [0, 1],
    ">=": [0, 1],
    "==": [0, 1],
    "!=": [0, 1],
    "+": [2, 3],
    "-": [2, 3],
    "*": [4, 5],
    "/": [4, 5],
    "%": [4, 5],
    "^": [7, 6],
  }

  return INFIX_BINDING_POWER[op as string];
}
