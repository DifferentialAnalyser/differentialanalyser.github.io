/**
 * Type represting the enum of all binary operators
 */
export type BinaryOperator = "+" | "-" | "/" | "*" | "^" | "==" | "!=" | ">" | "<" | ">=" | "<=" | "%";

/**
 * Representation of the use of a binary operator on two expressions in the AST
 */
export type BinaryOperation = {
  _type: BinaryOperator,

  /**
   * The expression on the left of the binary operator
   */
  left: ParsedExpression,

  /**
   * The expression on the right of the binary operator
   */
  right: ParsedExpression,
};

/**
 * Type represting the enum of all unary (prefix) operators
 */
export type UnaryOperator = "-" | "+";

/**
 * Representation of the use of a unary operator on an expressions in the AST
 */
export type UnaryOperation = {
  _type: UnaryOperator,

  /**
   * The expression on the right of the unary operator
   */
  right: ParsedExpression,
};

/**
 * Representation of the evaluation of a function with the given arguments
 */
export type FunctionCall = {
  _type: "fn",

  /**
   * Identifier of the function to call
   */
  ident: string,

  /**
   * Parameters to pass to the function
   */
  params: ParsedExpression[],
};

/**
 * Representation of a variable in the AST
 */
export type Variable = {
  _type: "var",
  ident: string,
};

/**
 * Representation of a literal value in the AST
 */
export type Literal = {
  _type: "lit",
  value: number,
};

/**
 * Representation of a sum/product over a range in the AST
 */
export type Sequence = {
  _type: "prod" | "sum",

  /**
   * Identifier of the iteration variable
   */
  ident: string,

  /**
   * Expression to compute the starting value of the sum/product
   */
  start: ParsedExpression,

  /**
   * Expression to compute the final value of the sum/product
   */
  end: ParsedExpression,

  /**
   * Expression to compute each iteration of the sum/product
   */
  value: ParsedExpression,
};

/**
 * Representation of a substitution of a variable into an expression in the AST
 */
export type Let = {
  _type: "let",

  /**
   * Identifier of the variable to substitue
   */
  ident: string,

  /**
   * Expression to evaluate the value of the subsituted variable
   */
  value: ParsedExpression,

  /**
   * Expression to substitute the value into
   */
  cons: ParsedExpression,
};

/**
 * Sum type representing all possible terms in an expression
 */
export type ParsedExpression =
  | BinaryOperation
  | UnaryOperation
  | FunctionCall
  | Variable
  | Literal
  | Sequence
  | Let
  ;
