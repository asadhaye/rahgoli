// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_OPERATION = {
  operations: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const eidMode = input.deliveryCustomization?.metafield?.value === 'true';

  if (!eidMode) {
    return EMPTY_OPERATION;
  }

  const operations = input.cart.deliveryGroups.flatMap((deliveryGroup) => {
    return deliveryGroup.deliveryOptions.map((option) => {
      // Logic: If Eid Mode is enabled, append " (Eid Delivery)" to all titles
      return {
        rename: {
          deliveryOptionHandle: option.handle,
          title: `${option.title} (Eid Delivery Notification)`,
        },
      };
    });
  });

  return {
    operations,
  };
}
