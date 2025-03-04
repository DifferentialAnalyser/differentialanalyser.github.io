import { Config } from "./config";

import _linear_integration_example from "../examples/linear-integration-example.json";
import _damped_oscillation_example from "../examples/damped-oscillation-example.json";
import _weierstrauss_function_example from "../examples/weierstrauss-function-example.json";
import _gear_pair_example from "../examples/gear-pair-example.json";
import _epicycloid_example from "../examples/epicycloid-example.json";
import _freefall_example from "../examples/body-in-free-fall-example.json";
import _duffing_equation_example from "../examples/duffing-equation-example.json";
import _simple_pendulum_example from "../examples/simple-pendulum-example.json";
import _double_pendulum_example from "../examples/double-pendulum-example.json";

export const DAMPED_OSCILLATION_EXAMPLE: Config = _damped_oscillation_example as any;
export const FREE_FALL_EXAMPLE: Config = _freefall_example as any;

export const LINEAR_INTEGRATION_EXAMPLE: Config = _linear_integration_example as any;
export const GEAR_PAIR_EXAMPLE: Config = _gear_pair_example as any;
export const WEIERSTRAUSS_FUNCTION_EXAMPLE: Config = _weierstrauss_function_example as any;

export const EPICYCLOID_EXAMPLE: Config = _epicycloid_example as any;
export const DUFFING_EQUATION_EXAMPLE: Config = _duffing_equation_example as any;
export const SIMPLE_PENDULUM_EXAMPLE: Config = _simple_pendulum_example as any;
export const DOUBLE_PENDULUM_EXAMPLE: Config = _double_pendulum_example as any;

// Examples needed for tests
import _oscillation_example from "../examples/oscillation-test.json";

export const OSCILLATION_EXAMPLE: Config = _oscillation_example as any;
