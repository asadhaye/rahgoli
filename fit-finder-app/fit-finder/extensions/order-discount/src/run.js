// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_OPERATION = {
  discountApplicationStrategy: 'FIRST',
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const isDelayed = input.cart.attribute?.value === 'true';

  if (!isDelayed) {
    return EMPTY_OPERATION;
  }

  return {
    discountApplicationStrategy: 'FIRST',
    discounts: [
      {
        value: {
          percentage: {
            value: '10.0',
          },
        },
        targets: [
          {
            orderSubtotal: {
              excludedVariantIds: [],
            },
          },
        ],
        message: '10% Delayed Delivery Discount',
      },
    ],
  };
}
