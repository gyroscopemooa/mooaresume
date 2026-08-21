export function getCheckoutReturnOrigin(requestUrl: URL) {
  if (requestUrl.protocol !== "http:" && requestUrl.protocol !== "https:") {
    throw new Error("CHECKOUT_RETURN_PROTOCOL_NOT_ALLOWED");
  }

  return requestUrl.origin;
}
