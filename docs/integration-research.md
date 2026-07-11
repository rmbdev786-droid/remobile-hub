# Integration Research Notes

## Verified bol.com API facts

- The official Partner API documentation identifies Offers API **v11** as current, while the broader Retailer API, Orders & Shipments API, and Subscriptions API remain on **v10**.
- Offers API v11 processes offer creation and updates synchronously, so a process-status polling flow is not required for v11 offer operations.
- The official offer API exposes create, retrieve one, retrieve paginated offers, retrieve not-for-sale reasons, update, and delete operations.
- bol.com authenticates integrations using OAuth2 against `login.bol.com`.
- bol.com publishes rate-limit headers and enforces endpoint-specific throttles, so the client must honor `Retry-After` and avoid unnecessary calls.
- The Subscriptions API supports push notifications through webhooks, GCP Pub/Sub, and AWS SQS. Webhook receivers must return a 2xx response within five seconds; repeated failure can disable the subscription.

Sources:

- https://api.bol.com/retailer/public/Retailer-API/index.html
- https://api.bol.com/retailer/public/Retailer-API/v11/functional/offer-api/offer-api.html
- https://api.bol.com/retailer/public/Retailer-API/v10/functional/retailer-api/subscriptions.html
- https://api.bol.com/retailer/public/Retailer-API/conventions.html

## Verified Foxway API facts

- Foxway publishes an OpenAPI/Swagger interface at `https://foxway.shop/swagger/ui/index.html`.
- Catalog endpoints include `GET /api/v1/catalogs`, `GET /api/v1/catalogs/{urlSlug}`, and dedicated manufacturer, pricelist, and stock resources.
- Dropshipping endpoints include create order, list orders, fetch by reference, confirm payment, cancel, retrieve invoices/documents, and retrieve credit terms.
- SKU availability is exposed through `GET /api/v1/sku/{sku}`; the public Swagger does not show the prompt's proposed `GET /api/v1/catalogs/{slug}/{sku}` route.
- The implementation should therefore keep the requested client method name but map SKU availability to the verified SKU endpoint.

Source:

- https://foxway.shop/swagger/ui/index.html

