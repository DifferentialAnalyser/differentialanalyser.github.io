  /**
   * @enum ConfigError
   * @description determines state of devices and shafts, 
   * FATAL_ERROR is if there is jam
   * NO_ERROR is if shaft or device is well configured
   * NOT_SET_UP is if device is missing input or output
   * @author Andy Zhu
   */

export enum ConfigError {
    FATAL_ERROR,
    NO_ERROR,
    NOT_SET_UP
}