Getting Started

The Lulu Print API allows you to use Lulu as your production and fulfillment network. The API provides access to the same functionality that Lulu uses internally to normalize files and send Print-Jobs to our production partners around the world.

The Lulu Print API is a RESTful API that communicates with JSON encoded messages. Communication is secured with OpenID Connect and transport layer security (HTTPS).

Working with the API requires intermediate level programming skills and a general understanding of web APIs. Check out Lulu’s printing and fulfillment options without having to do technical work upfront.
Registration

You have to create an account to start using the Lulu Print API. Your account will automatically receive a client-key and a client-secret.
Sandbox Environment

The API is available in a production and a sandbox environment. The sandbox can be used for development and testing purposes. Print-Jobs created on the sandbox will never be forwarded to a real production and can be paid for with test credit cards.

To access the sandbox, you have to create a separate account at https://developers.sandbox.lulu.com/.

The sandbox API endpoint URL is https://api.sandbox.lulu.com/.
Authorization

The Lulu API uses OpenID Connect, an authentication layer built on top of OAuth 2.0. Instead of exchanging username and password, the API uses JSON Web Token (JWT) to authorize client requests.

To interact with the API you need a client-key and a client-secret. Open the Client Keys & Secret (Sandbox) page to generate them.


Generate a Token

To interact with the API you first have to generate an OAuth token. This requires the following parameters:

client_key
client_secret
grant-type must be set to client_credentials
You have to send a POST request to the token endpoint a special Authorization header. For your convenience, you can copy the authorization string directly from your API Keys page:

curl -X POST https://api.lulu.com/auth/realms/glasstree/protocol/openid-connect/token \
  -d ‚grant_type=client_credentials‘ \
  -H ‚Content-Type: application/x-www-form-urlencoded‘ \
  -H ‚Authorization: Basic ZjJjNDdmMTctOWMxZi00ZWZlLWIzYzEtMDI4YTNlZTRjM2M3OjMzOTViZGU4LTBkMjQtNGQ0Ny1hYTRjLWM4NGM3NjI0OGRiYw==‚
The request will return a JSON response that contains an access_token key:

{
    „access_token“:“eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkI...“,
    „expires_in“:3600,
    „refresh_expires_in“:604800,
    „refresh_token“:“eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6...“,
    „token_type“:“bearer“,
    „not-before-policy“:0,
    „session_state“:“a856fb91-eafc-460e-8f6a-f09325062c88“
}
Store this access_token and use it to authorize all further requests. The token will expire after a few minutes, but you can always request a fresh token from the server as outlined above. We recommend to use an OAuth capable client lib in your favorite programming language to simplify working with client credentials and tokens. Some might even automatically refresh your token after it expired.
Make authenticated requests

To authenticate subsequent API requests, you must provide a valid access token in the HTTP header of the request: Authorization: Bearer {access_token}:

curl -X GET https://api.lulu.com/{some_api_endpoint}/ \
  -H ‚Authorization: Bearer {access_token}‘ \
  -H ‚Content-Type: application/json‘
Select a Product

Lulu’s Print API offers a wide range of products. Each product is represented by a 27 character code call pod_package_id:

Trim Size + Color + Print Quality + Bind + Paper + PPI + Finish + Linen + Foil = pod_package_id
Here are a few examples:

pod_package_id	Description
0850X1100BWSTDLW060UW444MNG	0850X1100: trim size 8.5” x 11”
BW: black-and-white
STD: standard quality
LW: linen wrap binding
060UW444: 60# uncoated white paper with a bulk of 444 pages per inch
M: matte cover coating
N: navy colored linen
G: golden foil stamping
0600X0900FCSTDPB080CW444GXX	0600X0900: trim size 6” x 9”
FC: full color
STD: standard quality
PB: perfect binding
080CW444: 80# coated white paper with a bulk of 444 ppi
G: gloss cover coating
X: no linen
X: no foil
0700X1000FCPRECO060UC444MXX	7“ x 10“ black-and-white premium coil-bound book printed on 60# cream paper with a matte cover
0600X0900BWSTDPB060UW444MXX	6“ x 9“ black-and-white standard quality paperback book printed on 60# white paper with a matte cover
Use the Pricing Calculator to input your product specifications and generate a SKU for your product. Once a price is calculated, the SKU will be available in the Your Selection area.

For a full listing of Lulu SKUs and product specification, download the Product Specification Sheet. Also, please download and review our Production Templates for additional guidance with formatting and file preparation. If you have general questions about which Lulu products are right for your business, please contact one of our experts through our Technical Support form.
Validate files

Validate interior file

Print API allows you to validate your interior file without creating a Print-Job. Interior validation requires publicly exposed URL to download and validate a file. File validation is being done asynchronously, it may take a while, so to retrieve validation result, use GET endpoint.

File validation result may return different statuses:

NULL - file validation is not started yet
VALIDATING - file validation is still running
VALIDATED - file validation finished without any errors
NORMALIZING - file normalization (next step of validation, available only if pod_package_id is was passed in the payload) is still running
NORMALIZED - file normalization finished without any errors
ERROR - file is invalid, list of errors is included in the response
So there are 3 possible final statuses of validation:

VALIDATED - validation succeeded
NORMALIZED - validation succeeded, possible only if pod_package_id was added to the payload
ERROR - validation failed
Example reasons of ERROR status:

invalid PDF file
not enough pages - at least 2 pages are required
different sizes of pages
fonts not embedded
corrupted images
Applicable reasons should be included in errors field in the file validation response.

You can find the detailed endpoints documentation in interior validation section.

Calculate cover dimensions

You can also calculate required cover dimensions basing on interior data by using cover dimensions endpoint. This endpoint returns cover width and height in requested unit (print points by default).

Validate cover file

As it was possible with interior file, Print API also allows you to validate cover files. Just as interior validation, cover validation requires publicly exposed URL to download and validate a file. Other required attributes are POD package ID of your book and interior page count to correctly validate cover file. Also in this case, file validation is being done asynchronously, it may take a while, so to retrieve validation result, use GET endpoint.

File validation result may return different statuses:

NULL - file validation is not started yet
NORMALIZING - file validation is still running
NORMALIZED - file validation finished without any errors
ERROR - file is invalid, list of errors is included in the response
Example reasons of ERROR status:

invalid PDF file
invalid file size
Applicable reasons should be included in errors field in the file validation response.

You can find the detailed endpoints documentation in cover validation section.
Create a Print-Job

Now you can start to create Print-Jobs. A Print-Job request consists of at least three data fields:

line_items (required): the list of books that shall be printed
shipping_address (required): the (end) customer’s address where Lulu should send the books - including a phone number.
contact_email (required): an email address for questions regarding the Print-Job - normally, you want to use the email address of a developer or shop owner, not the end customer
shipping_level(required): Lulu offers five different quality levels for shipping:
MAIL - Slowest ship method. Depending on the destination, tracking might not be available.
PRIORITY_MAIL - priority mail shipping
GROUND - Courier based shipping using ground transportation in the US.
EXPEDITED - expedited (2nd day) delivery via air mail or equivalent
EXPRESS - overnight delivery. Fastest shipping available.
external_id (optional): a reference number to link the Print-Job to your system (e.g. your order number)
The shipping address must contain a phone number. This is required by our shipping carriers. If the shipping address does not contain a phone number, the default phone number from the account will be used. If neither the account nor the shipping address contain a phone number, the Print-Job can not be created.

You can find the detailed documentation for Creating a new Print-Job below.
Check Print-Job Status

After sending a Print-Job, you can check its status. Normally, a Print-Job goes through the following stages:


CREATED: Print-Job created
UNPAID: Print-Job can be paid
PAYMENT_IN_PROGRESS: Payment is in Progress
PRODUCTION_DELAYED: Print-Job is paid and will move to production after the mandatory production delay.
PRODUCTION_READY: Production delay has ended and the Print-Job will move to „in production“ shortly.
IN_PRODUCTION: Print-Job submitted to printer
SHIPPED: Print-Job is fully shipped
There are a few more status that can occur when there is a problem with the Print-Job:

REJECTED: When there is a problem with the input data or the file, Lulu will reject a Print-Job with a detailed error message. Please contact our experts if you need help in resolving this issue.
CANCELED: You can cancel a Print-Job as long as it is “unpaid” using an API request to the status endpoint. In rare cases, Lulu might also cancel a Print-Job if a problem has surfaced in production and the order cannot be fulfilled.
Shipping Notification

Once an order has been shipped, Lulu will provide tracking information in the Print-Job and Print-Job Status endpoint. Example shipped response:

{
  „name“: „SHIPPED“,
  „message“: „All line-items were shipped“,
  „changed“: „2024-04-10T09:28:34.870842Z“,
  „line_item_statuses“: [
    {
      „name“: „SHIPPED“,
      „messages“: {
        „tracking_id“: „3d4a53da-cc42-44c2-b47b-c3da8fa37491_1“,
        „tracking_urls“: [
          „https://api.sandbox.lulu.com/printer-wannabe-tracking/3d4a53da-cc42-44c2-b47b-c3da8fa37491_1“
        ],
        „carrier_name“: „Carrier“
      },
      „line_item_id“: 57999
    }
  ],
  „print_job_id“: 42776
}
Webhooks

You can subscribe to receive webhooks on the following topics:

PRINT_JOB_STATUS_CHANGED
To subscribe to webhooks, create a webhook configuration by calling this endpoint. You have to select topics that you want to subscribe to and the URL where webhooks should be sent. You can create multiple webhooks, but the URL has to be unique for each of them.

Once you created a webhook configuration, you can retrieve a list of owned webhook or single webhook to check data:

id
topics
URL
is_active
It can be updated, for example, if you want to update the URL, list of subscribed topics or activate it after automatic deactivation.

It can be also deleted - this operation cannot be undone.

Once the webhook configuration is created, you should start receiving webhooks depending on topics that you are subscribed to. Each submission payload contains 2 fields:

topic
data - depends on the topic
Each webhook submission has calculated HMAC - a request payload signed with webhook’s owner API secret. HMAC is sent in Lulu-HMAC-SHA256 header. HMAC is calculated with API secret as a key (UTF-8 encoded), payload as a message (UTF-8 encoded) and SHA-256 as hash function. To validate HMAC, it should be calculated using raw response data - parsing it to JSON can cause formatting issues.

If a webhook submission fails for any reason (connection error, HTTP error, etc.), it is retried 5 times. After 5 different failed submissions in a row, the webhook is deactivated (is_active field is set to false). It can be activated back by updating it. There is an option to test webhook submission by calling test endpoint. It sends dummy data of the selected topic to configured URL.

All webhooks submissions can be retrieved by calling this endpoint. It returns all submissions created during the last 30 days.

PRINT_JOB_STATUS_CHANGED topic

PRINT_JOB_STATUS_CHANGED webhook is sent every time owned print job status is updated. The data sent in the payload is print job data, the same as returned by print job details endpoint.
Print-Job Cost Calculations

Create a Print-Job cost calculation

This endpoint allows you to calculate product and shipping cost without creating a Print-Job. Typically used in an offer or checkout situation. The address is required to calculate sales tax / VAT and shipping cost.
AUTHORIZATIONS:
oauth2
REQUEST BODY SCHEMA: application/json

line_items
required
Array of objects
The line items that should be calculated
shipping_address
required
object
The shipping address for calculating Print-Job cost
shipping_option
required
string
Enum: „MAIL“ „PRIORITY_MAIL“ „GROUND_HD“ „GROUND_BUS“ „GROUND“ „EXPEDITED“ „EXPRESS“
The shipping option level
Responses

201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found

POST
/print-job-cost-calculations/
Request samples

PayloadPythonRubyNodeJavaJavascriptcURL
Content type
application/json
Example
Shipping Express to Germany

Copy
Expand all Collapse all
{
„line_items“: [
{},
{}
],
„shipping_address“: {
„city“: „Lübeck“,
„country_code“: „DE“,
„postcode“: „23552“,
„state_code“: null,
„street1“: „Holstenstr. 40“,
„phone_number“: „844-212-0689“
},
„shipping_option“: „EXPRESS“
}
Response samples

201400401403404
Content type
application/json

Copy
Expand all Collapse all
{
„shipping_address“: {
„city“: „Lübeck“,
„country_code“: „DE“,
„is_business“: false,
„name“: „Hans Dampf“,
„phone_number“: „844-212-0689“,
„postcode“: „23552“,
„state_code“: „“,
„street1“: „Holstenstr. 40“,
„street2“: „“,
„warnings“: {},
„suggested_address“: {}
},
„currency“: „USD“,
„fees“: [
{},
{}
],
„fulfillment_cost“: {
„tax_rate“: „0.06“,
„total_cost_excl_tax“: „0.75“,
„total_cost_incl_tax“: „0.80“,
„total_tax“: „0.05“
},
„line_item_costs“: [
{},
{}
],
„shipping_cost“: {
„tax_rate“: „0.06“,
„total_cost_excl_tax“: „318.44“,
„total_cost_incl_tax“: „337.55“,
„total_tax“: „19.11“
},
„total_cost_excl_tax“: „2129.59“,
„total_cost_incl_tax“: „2257.37“,
„total_discount_amount“: „92.60“,
„total_tax“: „127.78“
}
Print-Jobs

Retrieve a list of Print-Jobs

Use this request to show a list of Print-Jobs. The list is paginated and can be filtered by various attributes that are given as query parameters.

Timestamps like created_after, created_before, modified_after, and modified_before can be entered as ISO8601 datetime strings.

Internally, the Lulu API uses Coordinated Universal Time (UTC). The following formats are valid:

2017-11-09 (date only)
2017-11-09T09:30 (datetime with minute precision)
2017-11-09T09:30:08 (datetime with second precision)
2017-11-09T09:30:08Z (UTC datetime)
2017-11-09T09:30:08+06:00 (datetime with offset)
To filter Print-Jobs by status you can use any valid status string (CREATED, REJECTED, UNPAID, PAYMENT_IN_PROGRESS, PRODUCTION_READY, PRODUCTION_DELAYED, IN_PRODUCTION, ERROR, SHIPPED, CANCELED). PAYMENT_IN_PROGRESS and PRODUCTION_READY are rather short-lived states that exist only for a few minutes at max; filtering by these status will rarely yield any results.
AUTHORIZATIONS:
oauth2
QUERY PARAMETERS

page	
integer
Result page, default: 1
page_size	
integer
The default is 100.
created_after	
string
Filter by creation timestamp after the given (ISO 8601) timestamp.
created_before	
string
Filter by creation timestamp before the given (ISO 8601) timestamp.
modified_after	
string
Filter by modification timestamp after the given (ISO 8601) timestamp.
modified_before	
string
Filter by modification timestamp before the given (ISO 8601) timestamp.
status	
string
Filter by status
id	
string
Filter by id
order_id	
string
Filter by order_id
exclude_line_items	
boolean
Leave the list of line_items out of the Print-Jobs in the response.
search	
string
Search across the fields id, external_id, order_id, status, line_item_id, line_item_external_id, line_item_title, line_item_tracking_id and shipping_address
ordering	
string
Which field to use when ordering the results.
Responses

200 OK
401 Unauthorized
403 Forbidden

GET
/print-jobs/
Request samples

PythonRubyNodeJavaJavascriptcURL

Copy
import requests

url = „https://api.lulu.com/print-jobs/„

payload = {}
headers = {
  ‚Authorization‘: ‚Check Authentication menu‘,
  ‚Cache-Control‘: ‚no-cache‘
}

response = requests.request(„GET“, url, headers=headers, data=payload)

print(response.text)
Response samples

200401403
Content type
application/json

Copy
Expand all Collapse all
{
„count“: 1,
„next“: „https://api.lulu.com/resources/?page=1&page_size=1“,
„previous“: „https://api.lulu.com/resources/?page=1&page_size=1“,
„results“: [
{}
]
}
Create a new Print-Job

Print-Jobs are the core resource of the Print API. A Printjob consists of line items, shipping information and some additional metadata.

Elements of a Print-Job

Line Items

A line item represents a book that should be printed or in short a printable. Printables consist of cover and interior files as well as a pod_package_id. The pod_package_id represents the manufacturing options; see the „Select a product“ section for details. Each printable can be identified by an immutable printable_id. The printable_id can be used for re-orders so that the files don‘‘t have to be transferred again.

Linen Wrap Foil

Foil stamping is available on Hardcover Linen with Dust Jacket products only. The foil stamp is placed on the spine of your book and cannot exceed 42 characters.

Lulu’s foil stamping supports the following characters:

Roman Character sets (A-Z, a-z, 0-9)
[];‘,./!`^&*()~+=:?“]ˇ˘°´¨¸¯- ØŁ
ÀÁÃĀÄĂĆČÇĎÈÉËĒĔĚĞÌÍĨÏĪĬĽĹÑŃŇÒÓÕÖŌŎŔŘŚŞŠŢŤÙÚŨŪÜŬÝŸŹŽ
àáãäāăćčçďèéëēĕěğìíĩïīĭľĺñńňòóõöōŏŕřśşšţťùúũūüŭýÿźž
Unsupported characters:

_ and all non-roman character sets (Cyrillic, Arabic, Hebrew, Farsi, Chinese, Japanese, Thai, etc.)
Your linen and foil stamping color selections should be included at the end of your SKU using the following letters to indicate color, with the linen option first and the foil stamping option last:

Linen:

Navy: N
Gray: G
Red: R
Black: B
Tan: T
Forest: F
Foil:

Gold: G
Black: B
White: W
For example: 0600X0900BWSTDPB060UW444MNG

Shipping Information & Metadata

Print-Jobs have to contain a shipping_address as well as a shipping_level. Lulu offers five different service levels that differ in speed and traceability.

Additional Metadata

A few additional metadata fields can be specified in the Print-Job as well:

contact_email for questions related to the Print-Job itself
production_delay allows you to specify a delay (between 60 minutes and 2,880 minutes) before the Print-Job goes to production.
external_id allows you to link the Print-Job to an internal order number or other reference.
recipient_tax_id is required for shipping addresses to Brazil, Chile, and Mexico. This field holds the recipient’s tax identification number (CPF/CNPJ for Brazil, RUT for Chile, and RFC for Mexico). The tax ID can be provided in formatted form (with dots, dashes, or slashes), but will be standardized to a compact version without separators (e.g., „12.345.678/0001-90“ will be converted to „12345678000190“) for further processing.
File Handling and Normalization

Interior and cover files have to be specified with a URL from which Lulu can download the files. Using encoded basic authentication in the URL is ok. All files processed by Lulu will be validated and normalized before sending them to production. If problems with the file occur, the PrintJob will be rejected or cancelled and an error message will be displayed.

Automation and Payment

After a Print-Job has been created successfully, it will remain in an UNPAID state until it is paid for through the developer portal. However, you can automate the process by putting a credit card on file. Then, the Print-Job will automatically transition to the PRODUCTION_DELAY status and your card will charged when the Print-Job is sent to production.

For any questions related to alternative payment options, contact our support team.
AUTHORIZATIONS:
oauth2
REQUEST BODY SCHEMA: application/json

contact_email
required
string <email>
Email address that should be contacted if questions regarding the Print-Job arise. Lulu recommends to use the email of a person who is responsible for placing the Print-Job like a developer or business owner.
external_id	
string
Arbitrary string to identify and connect a print job to your systems. Set it to an order number, a purchase order or whatever else works for your particular use case.
line_items
required
Array of objects
The line items of a Print-Job, defining it’s Printables and their quantities. The property name ‚items‘ can be used instead.
production_delay	
integer <int32> [ 60 .. 2880 ]
Default: 60
Delay before a newly created Print-Job is sent to production. Minimum is 60 minutes, maximum is 2880 minutes (=48 hours). As most cancellation requests occur right after an order has been placed, it makes sense to wait for some time before sending an order to production. Once production has started, orders cannot be canceled anymore.
shipping_address
required
object
The shipping address of the customer.
shipping_level
required
string
Enum: „MAIL“ „PRIORITY_MAIL“ „GROUND_HD“ „GROUND_BUS“ „GROUND“ „EXPEDITED“ „EXPRESS“
The shipping level that this Print-Job is shipped with
Responses

201 Created
400 Bad Request
401 Unauthorized
403 Forbidden

POST
/print-jobs/
Request samples

PayloadPythonRubyNodeJavaJavascriptcURL
Content type
application/json
Example
Example Book

Copy
Expand all Collapse all
{
„contact_email“: „test@test.com“,
„external_id“: „demo-time“,
„line_items“: [
{}
],
„production_delay“: 120,
„shipping_address“: {
„city“: „Lübeck“,
„country_code“: „GB“,
„name“: „Hans Dampf“,
„phone_number“: „844-212-0689“,
„postcode“: „PO1 3AX“,
„state_code“: „“,
„street1“: „Holstenstr. 48“
},
„shipping_level“: „MAIL“
}
Response samples

201400401403
Content type
application/json

Copy
Expand all Collapse all
{
„contact_email“: „test@test.com“,
„costs“: {
„line_item_costs“: null,
„shipping_cost“: null,
„total_cost_excl_tax“: null,
„total_cost_incl_tax“: null,
„total_tax“: null
},
„date_created“: „2017-08-07T08:47:26.485456Z“,
„date_modified“: „2017-08-07T08:47:26.485490Z“,
„estimated_shipping_dates“: {
„arrival_max“: „2017-08-12“,
„arrival_min“: „2017-08-10“,
„dispatch_max“: „2017-08-09“,
„dispatch_min“: „2017-08-07“
},
„external_id“: „demo-time“,
„id“: 1,
„line_items“: [
{}
],
„production_delay“: 120,
„production_due_time“: null,
„shipping_address“: {
„city“: „Lübeck“,
„country_code“: „DE“,
„is_business“: false,
„name“: „Hans Dampf“,
„phone_number“: „844-212-0689“,
„postcode“: „23552“,
„state_code“: „“,
„street1“: „Holstenstr. 40“,
„street2“: „“,
„warnings“: {},
„suggested_address“: {}
},
„shipping_level“: „MAIL“,
„shipping_option_level“: „MAIL“,
„status“: {
„changed“: „2017-08-07T08:47:26.480493Z“,
„message“: „Print-job is currently being validated“,
„name“: „CREATED“
}
}
Create a new Print-Job (as Reprint)

Usage of printable_id

The immutable printable_id can be used for re-orders so that the files don’t have to be transferred again. Given there is an already created and validated Print-Job, you can use the printable_id of each line-item to create re-orders for that particular printable. As the normalized files are already on the server, you omit the complete printable_normalization object from the request and send a valid printable_id instead.

Shipping Information & Metadata

Print-Jobs have to contain a shipping_address as well as a shipping_level. Lulu offers five different service levels that differ in speed and traceability.

Additional Metadata

A few additional metadata fields can be specified in the Print-Job as well:

contact_email for questions related to the Print-Job itself,
production_delay allows you to specify a delay (between 60 minutes and 2,880 minutes) before the Print-Job goes to production,
external_id allows you to link the Print-Job to an internal order number or other reference.
File Handling and Normalization

If there is an existing printable for the given printable_id the already processed and normalized files are used for production. If there are are problems with the printable_id, the PrintJob will be rejected or cancelled and an error message will be displayed.

Automation and Payment

After a Print-Job has been created successfully, it will remain in an UNPAID state until it is paid for through the developer portal. However, you can automate the process by putting a credit card on file. Then, the Print-Job will automatically transition to the PRODUCTION_DELAY status and your card will charged when the Print-Job is sent to production.
AUTHORIZATIONS:
oauth2
REQUEST BODY SCHEMA: application/json

contact_email
required
string <email>
Email address that should be contacted if questions regarding the Print-Job arise. Lulu recommends to use the email of a person who is responsible for placing the Print-Job like a developer or business owner.
external_id	
string
Arbitrary string to identify and connect a print job to your systems. Set it to an order number, a purchase order or whatever else works for your particular use case.
line_items
required
Array of objects
The line items of a Print-Job, defining it’s Printables and their quantities. The property name ‚items‘ can be used instead.
production_delay	
integer <int32> [ 60 .. 2880 ]
Default: 60
Delay before a newly created Print-Job is sent to production. Minimum is 60 minutes, maximum is 2880 minutes (=48 hours). As most cancellation requests occur right after an order has been placed, it makes sense to wait for some time before sending an order to production. Once production has started, orders cannot be canceled anymore.
shipping_address
required
object
The shipping address of the customer.
shipping_level
required
string
Enum: „MAIL“ „PRIORITY_MAIL“ „GROUND_HD“ „GROUND_BUS“ „GROUND“ „EXPEDITED“ „EXPRESS“
The shipping level that this Print-Job is shipped with
Responses

201 Created
400 Bad Request
401 Unauthorized
403 Forbidden

POST
/print-jobs/ 
Request samples

PayloadPythonRubyNodeJavaJavascriptcURL
Content type
application/json

Copy
Expand all Collapse all
{
„contact_email“: „test@test.com“,
„external_id“: „demo-time“,
„line_items“: [
{}
],
„production_delay“: 120,
„shipping_address“: {
„city“: „Lübeck“,
„country_code“: „GB“,
„name“: „Hans Dampf“,
„phone_number“: „844-212-0689“,
„postcode“: „PO1 3AX“,
„state_code“: „“,
„street1“: „Holstenstr. 48“
},
„shipping_level“: „MAIL“
}
Response samples

201400401403
Content type
application/json

Copy
Expand all Collapse all
{
„contact_email“: „test@test.com“,
„costs“: {
„line_item_costs“: null,
„shipping_cost“: null,
„total_cost_excl_tax“: null,
„total_cost_incl_tax“: null,
„total_tax“: null
},
„date_created“: „2017-08-07T08:47:26.485456Z“,
„date_modified“: „2017-08-07T08:47:26.485490Z“,
„estimated_shipping_dates“: {
„arrival_max“: „2017-08-12“,
„arrival_min“: „2017-08-10“,
„dispatch_max“: „2017-08-09“,
„dispatch_min“: „2017-08-07“
},
„external_id“: „demo-time“,
„id“: 1,
„line_items“: [
{}
],
„production_delay“: 120,
„production_due_time“: null,
„shipping_address“: {
„city“: „Lübeck“,
„country_code“: „DE“,
„is_business“: false,
„name“: „Hans Dampf“,
„phone_number“: „844-212-0689“,
„postcode“: „23552“,
„state_code“: „“,
„street1“: „Holstenstr. 48“,
„street2“: „“
},
„shipping_level“: „MAIL“,
„shipping_option_level“: „MAIL“,
„status“: {
„changed“: „2017-08-07T08:47:26.480493Z“,
„message“: „Print-job is currently being validated“,
„name“: „CREATED“
}
}
Retrieve the number of Print-Jobs in each status

AUTHORIZATIONS:
oauth2
QUERY PARAMETERS

page	
integer
Result page, default: 1
page_size	
integer
The default is 100.
created_after	
string
Filter by creation timestamp after the given (ISO 8601) timestamp.
created_before	
string
Filter by creation timestamp before the given (ISO 8601) timestamp.
modified_after	
string
Filter by modification timestamp after the given (ISO 8601) timestamp.
modified_before	
string
Filter by modification timestamp before the given (ISO 8601) timestamp.
status	
string
Filter by status
id	
string
Filter by id
ordering	
string
Which field to use when ordering the results.
Responses

200 OK
401 Unauthorized
403 Forbidden
404 Not Found

GET
/print-jobs/statistics/
Request samples

PythonRubyNodeJavaJavascriptcURL

Copy
import requests

url = „https://api.lulu.com/print-jobs/statistics/„

payload = {}
headers = {
  ‚Authorization‘: ‚Check Authentication menu‘,
  ‚Cache-Control‘: ‚no-cache‘
}

response = requests.request(„GET“, url, headers=headers, data=payload)

print(response.text)
Response samples

200401403404
Content type
application/json

Copy
{
„count“: 3,
„status“: „PAYMENT_IN_PROGRESS“
}
Retrieve a single Print-Job

Retrieve a single Print-Job by id.
AUTHORIZATIONS:
oauth2
PATH PARAMETERS

id
required
string
Id of the resource
Responses

200 OK
401 Unauthorized
403 Forbidden
404 Not Found

GET
/print-jobs/{id}/
Request samples

PythonRubyNodeJavaJavascriptcURL

Copy
import requests

url = „https://api.lulu.com/print-jobs/{id}/„

payload = {}
headers = {
  ‚Authorization‘: ‚Check Authentication menu‘,
  ‚Cache-Control‘: ‚no-cache‘
}

response = requests.request(„GET“, url, headers=headers, data=payload)

print(response.text)
Response samples

200401403404
Content type
application/json

Copy
Expand all Collapse all
{
„child_job_ids“: [
2019
],
„contact_email“: „test@test.com“,
„costs“: {
„currency“: „USD“,
„line_item_costs“: [],
„shipping_cost“: {},
„fulfillment_cost“: {},
„total_cost_excl_tax“: „80.79“,
„total_cost_incl_tax“: „86.45“,
„total_discount_amount“: „14.80“,
„total_tax“: „5.66“,
„fees“: []
},
„date_created“: „2017-08-07T08:47:26.485456Z“,
„date_modified“: „2017-08-07T08:47:26.485490Z“,
„estimated_shipping_dates“: {
„arrival_max“: „2017-08-12“,
„arrival_min“: „2017-08-10“,
„dispatch_max“: „2017-08-09“,
„dispatch_min“: „2017-08-07“
},
„external_id“: „demo-time“,
„id“: 1,
„line_items“: [
{}
],
„order_id“: „1234“,
„parent_job_id“: 1921,
„production_delay“: 120,
„production_due_time“: null,
„shipping_address“: {
„city“: „Lübeck“,
„country_code“: „DE“,
„is_business“: false,
„name“: „Hans Dampf“,
„phone_number“: „844-212-0689“,
„postcode“: „23552“,
„state_code“: „“,
„street1“: „Holstenstr. 40“,
„street2“: „“,
„warnings“: {},
„suggested_address“: {}
},
„shipping_level“: „MAIL“,
„shipping_option_level“: „MAIL“,
„status“: {
„changed“: „2017-08-07T08:48:00.529399Z“,
„message“: „Print-job was accepted and needs to be paid“,
„name“: „UNPAID“
},
„tax_country“: „DE“
}
Retrieve Print-Job Costs

Sub-resource to retrieve only the costs of a Print-Job
AUTHORIZATIONS:
oauth2
PATH PARAMETERS

id
required
string
Id of the resource
Responses

200 OK
401 Unauthorized
403 Forbidden
404 Not Found

GET
/print-jobs/{id}/costs/
Request samples

PythonRubyNodeJavaJavascriptcURL

Copy
import requests

url = „https://api.lulu.com/print-jobs/{id}/costs/„

payload = {}
headers = {
  ‚Authorization‘: ‚Check Authentication menu‘,
  ‚Cache-Control‘: ‚no-cache‘
}

response = requests.request(„GET“, url, headers=headers, data=payload)

print(response.text)
Response samples

200401403404
Content type
application/json

Copy
Expand all Collapse all
{
„currency“: „USD“,
„line_item_costs“: [
{}
],
„shipping_cost“: {
„tax_rate“: „0.070000“,
„total_cost_excl_tax“: „65.99“,
„total_cost_incl_tax“: „70.61“,
„total_tax“: „4.62“
},
„fulfillment_cost“: {
„total_cost_excl_tax“: „0.75“,
„total_cost_incl_tax“: „0.81“,
„total_tax“: „0.06“,
„tax_rate“: „0.080000“
},
„total_cost_excl_tax“: „80.79“,
„total_cost_incl_tax“: „86.45“,
„total_discount_amount“: „14.80“,
„total_tax“: „5.66“,
„fees“: [
{}
]
}
Retrieve Print-Job Status

Sub-resource that represents the status of a Print-Job
AUTHORIZATIONS:
oauth2
PATH PARAMETERS

id
required
string
Id of the resource
Responses

200 OK
401 Unauthorized
403 Forbidden
404 Not Found

GET
/print-jobs/{id}/status/
Request samples

PythonRubyNodeJavaJavascriptcURL

Copy
import requests

url = „https://api.lulu.com/print-jobs/{id}/status/„

payload = {}
headers = {
  ‚Authorization‘: ‚Check Authentication menu‘,
  ‚Cache-Control‘: ‚no-cache‘
}

response = requests.request(„GET“, url, headers=headers, data=payload)

print(response.text)
Response samples

200401403404
Content type
application/json

Copy
{
„changed“: „2017-08-07T08:47:26.480493Z“,
„message“: „Print-job is currently being validated“,
„name“: „CREATED“
}
Cancel Print-Job

Cancel a single Print-Job by id.
AUTHORIZATIONS:
oauth2
PATH PARAMETERS

id
required
string
Id of the resource
REQUEST BODY SCHEMA: application/json

name	
string
Value: „CANCELED“
Status to change to
Responses

200 OK
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found

PUT
/print-jobs/{id}/status/
Request samples

PayloadPythonRubyNodeJavaJavascriptcURL
Content type
application/json

Copy
{
„name“: „CANCELED“
}
Response samples

200400401403404
Content type
application/json

Copy
{
„changed“: „2017-08-07T08:47:26.480493Z“,
„message“: „Print-job was canceled“,
„name“: „CANCELED“
}
Shipping Options

Retrieve List of Shipping Options

When integrating the Print API with your own shop, you might want to give customers an option to select among different shipping levels. This endpoint allows you to request available shipping methods (including cost) with minimal input data:

country
page_count
quantity
pod_package_id
currency only required if you don’t want USD
A valid state_code must be included in the shipping address to receive accurate shipping information.

Countries that require valid state code (ISO 3166-1 alpha-2 code in parentheses)
You can further restrict shipping options that support post box delivery by adding is_postbox=true to your shipping address data.
AUTHORIZATIONS:
Noneoauth2
REQUEST BODY SCHEMA: application/json

currency	
string
Currency to base cost calculations on, defaults to USD. Available currencies are AUD, CAD, EUR, GBP, and USD.
line_items
required
Array of objects
The line items that should be calculated
shipping_address
required
object
The shipping address for which shipping options will be found
Responses

200 OK
401 Unauthorized
403 Forbidden

POST
/shipping-options/
Request samples

PayloadPythonRubyNodeJavaJavascriptcURL
Content type
application/json

Copy
Expand all Collapse all
{
„currency“: „USD“,
„line_items“: [
{},
{}
],
„shipping_address“: {
„city“: „Washington“,
„country“: „US“,
„postcode“: „20540“,
„state_code“: „DC“,
„street1“: „101 Independence Ave SE“
}
}
Response samples

200401403
Content type
application/json

Copy
Expand all Collapse all
[
{
„business_only“: false,
„cost_excl_tax“: null,
„currency“: „EUR“,
„home_only“: false,
„id“: 21,
„level“: „EXPRESS“,
„max_delivery_date“: „2018-02-01“,
„max_dispatch_date“: „2018-01-28“,
„min_delivery_date“: „2018-01-29“,
„min_dispatch_date“: „2018-01-25“,
„postbox_ok“: false,
„shipping_buffer“: 0,
„total_days_max“: 8,
„total_days_min“: 6,
„traceable“: true,
„transit_time“: 4
}
]
Webhooks

Subscribe to webhooks

Subscribe to Print API webhooks by passing a list of topics that you want to subscribe to and the URL where webhooks should be sent.
AUTHORIZATIONS:
oauth2
REQUEST BODY SCHEMA: application/json

topics
required
Array of strings
Items Value: „PRINT_JOB_STATUS_CHANGED“
List of webhook topics
url
required
string
URL where webhook should be sent
Responses

201 OK
400 Bad Request
401 Unauthorized
403 Forbidden

POST
/webhooks/
Request samples

PayloadPythonRubyNodeJavaJavascriptcURL
Content type
application/json

Copy
Expand all Collapse all
{
„topics“: [
„PRINT_JOB_STATUS_CHANGED“
],
„url“: „https://www.webhooks-consumer.com/„
}
Response samples

201400401403
Content type
application/json

Copy
Expand all Collapse all
{
„id“: „f370d09b-912a-4667-9890-ed9bd0c32166“,
„is_active“: true,
„topics“: [
„PRINT_JOB_STATUS_CHANGED“
],
„url“: „https://www.webhooks-consumer.com/„
}
Retrieve list of webhooks

Retrieve a list of all owned webhooks.
AUTHORIZATIONS:
oauth2
Responses

200 OK
401 Unauthorized
403 Forbidden

GET
/webhooks/
Request samples

PythonRubyNodeJavaJavascriptcURL

Copy
import requests

url = „https://api.lulu.com/webhooks/„

payload = {}
headers = {
  ‚Authorization‘: ‚Check Authentication menu‘,
  ‚Cache-Control‘: ‚no-cache‘
}

response = requests.request(„GET“, url, headers=headers, data=payload)

print(response.text)
Response samples

200401403
Content type
application/json

Copy
Expand all Collapse all
{
„count“: 3,
„next“: „https://api.lulu.com/resources/?page=3&page_size=1“,
„previous“: „https://api.lulu.com/resources/?page=1&page_size=1“,
„results“: [
{}
]
}
Retrieve single webhook

AUTHORIZATIONS:
oauth2
PATH PARAMETERS

id
required
string
Id of the resource
Responses

200 OK
401 Unauthorized
403 Forbidden
404 Not Found

GET
/webhooks/{id}/
Request samples

PythonRubyNodeJavaJavascriptcURL

Copy
import requests

url = „https://api.lulu.com/webhooks/{id}/„

payload = {}
headers = {
  ‚Authorization‘: ‚Check Authentication menu‘,
  ‚Cache-Control‘: ‚no-cache‘
}

response = requests.request(„GET“, url, headers=headers, data=payload)

print(response.text)
Response samples

200401403404
Content type
application/json

Copy
Expand all Collapse all
{
„id“: „f370d09b-912a-4667-9890-ed9bd0c32166“,
„is_active“: true,
„topics“: [
„PRINT_JOB_STATUS_CHANGED“
],
„url“: „https://www.webhooks-consumer.com/„
}
Update webhook

Update owned webhook data: URL, list of subscribed topics. You can also activate or deactivate it.
AUTHORIZATIONS:
oauth2
PATH PARAMETERS

id
required
string
Id of the resource
REQUEST BODY SCHEMA: application/json

topics	
Array of strings
Items Value: „PRINT_JOB_STATUS_CHANGED“
List of webhook topics
url	
string
URL where webhook should be sent
is_active	
boolean
Activate or deactivate webhook
Responses

200 OK
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found

PATCH
/webhooks/{id}/
Request samples

PayloadPythonRubyNodeJavaJavascriptcURL
Content type
application/json

Copy
{
„url“: „https://www.webhooks-consumer.com/updated/„
}
Response samples

200400401403404
Content type
application/json

Copy
Expand all Collapse all
{
„id“: „f370d09b-912a-4667-9890-ed9bd0c32166“,
„is_active“: true,
„topics“: [
„PRINT_JOB_STATUS_CHANGED“
],
„url“: „https://www.webhooks-consumer.com/updated/„
}
Delete webhook

AUTHORIZATIONS:
oauth2
PATH PARAMETERS

id
required
string
Id of the resource
Responses

204 No Content
401 Unauthorized
403 Forbidden
404 Not Found

DELETE
/webhooks/{id}/
Request samples

PythonRubyNodeJavaJavascriptcURL

Copy
import requests

url = „https://api.lulu.com/webhooks/{id}/„

payload = {}
headers = {
  ‚Authorization‘: ‚Check Authentication menu‘,
  ‚Cache-Control‘: ‚no-cache‘
}

response = requests.request(„DELETE“, url, headers=headers, data=payload)

print(response.text)
Response samples

401403404
Content type
application/json

Copy
{
„detail“: „Authentication credentials were not provided.“
}
Test webhook topic submission

Sends payload with selected topic test data to webhook URL.
AUTHORIZATIONS:
oauth2
PATH PARAMETERS

id
required
string
Id of the resource
topic
required
string
Topic to test
Responses

200 OK
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found

POST
/webhooks/{id}/test-submission/{topic}/
Request samples

PythonRubyNodeJavaJavascriptcURL

Copy
import requests

url = „https://api.lulu.com/webhooks/{id}/test-submission/{topic}/„

payload = {}
headers = {
  ‚Authorization‘: ‚Check Authentication menu‘,
  ‚Cache-Control‘: ‚no-cache‘
}

response = requests.request(„POST“, url, headers=headers, data=payload)

print(response.text)
Response samples

200400401403404
Content type
application/json

Copy
„Test webhook submission queued“
Retrieve list of webhook submissions

Retrieve a list of all submissions of owned webhooks.
AUTHORIZATIONS:
oauth2
QUERY PARAMETERS

page	
integer
Result page, default: 1
page_size	
integer
The default is 100.
created_after	
string
Filter by creation timestamp after the given (ISO 8601) timestamp.
created_before	
string
Filter by creation timestamp before the given (ISO 8601) timestamp.
is_success	
boolean
Filter by is_success
response_code	
string
Filter by submission response code
webhook_id	
string <uuid>
Filter by webhook ID
Responses

200 OK
401 Unauthorized
403 Forbidden

GET
/webhook-submissions/
Request samples

PythonRubyNodeJavaJavascriptcURL

Copy
import requests

url = „https://api.lulu.com/webhook-submissions/„

payload = {}
headers = {
  ‚Authorization‘: ‚Check Authentication menu‘,
  ‚Cache-Control‘: ‚no-cache‘
}

response = requests.request(„GET“, url, headers=headers, data=payload)

print(response.text)
Response samples

200401403
Content type
application/json

Copy
Expand all Collapse all
{
„count“: 3,
„next“: „https://api.lulu.com/resources/?page=3&page_size=1“,
„previous“: „https://api.lulu.com/resources/?page=1&page_size=1“,
„results“: [
{}
]
}
Files validation

Validate interior file

This endpoint allows you to validate interior file
AUTHORIZATIONS:
oauth2
REQUEST BODY SCHEMA: application/json

source_url
required
string
Public url of the interior source file
pod_package_id	
string
POD Package ID of the book. Required to run extended validation.
Responses

201 Created
400 Bad Request
401 Unauthorized
403 Forbidden

POST
/validate-interior/
Request samples

PayloadPythonRubyNodeJavaJavascriptcURL
Content type
application/json

Copy
{
„source_url“: „https://www.dropbox.com/sh/p3zh22vzsaegiri/AACOUn3LFKsITDzylh13bQpsa/161025/thesis2.pdf?dl=1“
}
Response samples

201400401403
Content type
application/json

Copy
{
„id“: 1,
„source_url“: „https://www.dropbox.com/sh/p3zh22vzsaegiri/AACOUn3LFKsITDzylh13bQpsa/161025/thesis2.pdf?dl=1“,
„page_count“: 210,
„errors“: null,
„status“: „VALIDATING“,
„valid_pod_package_ids“: null
}
Retrieve a single file validation record

Retrieve a single file validation record
AUTHORIZATIONS:
oauth2
PATH PARAMETERS

id
required
integer
Example: 1
Id of the resource
Responses

200 OK
401 Unauthorized
403 Forbidden
404 Not Found

GET
/validate-interior/{id}/
Request samples

PythonRubyNodeJavaJavascriptcURL

Copy
import requests

url = „https://api.lulu.com/validate-interior/{id}/„

payload = {}
headers = {
  ‚Authorization‘: ‚Check Authentication menu‘,
  ‚Cache-Control‘: ‚no-cache‘
}

response = requests.request(„GET“, url, headers=headers, data=payload)

print(response.text)
Response samples

200401403404
Content type
application/json

Copy
{
„id“: 1,
„source_url“: „https://www.dropbox.com/sh/p3zh22vzsaegiri/AACOUn3LFKsITDzylh13bQpsa/161025/thesis2.pdf?dl=1“,
„page_count“: 210,
„errors“: null,
„status“: „VALIDATING“,
„valid_pod_package_ids“: null
}
Calculate cover dimensions

This endpoint allows you to calculate required cover dimensions basing on interior data.
AUTHORIZATIONS:
oauth2
REQUEST BODY SCHEMA: application/json

pod_package_id
required
string
POD Package ID of the book.
interior_page_count
required
integer
unit	
string
Enum: „pt“ „mm“ „inch“
Requested unit of cover dimensions. Defaults to print points.
Responses

201 Created
400 Bad Request
401 Unauthorized
403 Forbidden

POST
/cover-dimensions/
Request samples

PayloadPythonRubyNodeJavaJavascriptcURL
Content type
application/json

Copy
{
„pod_package_id“: „0600X0900BWSTDPB060UW444MXX“,
„interior_page_count“: 210
}
Response samples

201400401403
Content type
application/json

Copy
{
„width“: „920.000“,
„height“: „666.000“,
„unit“: „pt“
}
Validate cover file

This endpoint allows you to validate cover file
AUTHORIZATIONS:
oauth2
REQUEST BODY SCHEMA: application/json

source_url
required
string
Public url of the cover source file
pod_package_id
required
string
POD Package ID of the book.
interior_page_count
required
integer
Responses

201 Created
400 Bad Request
401 Unauthorized
403 Forbidden

POST
/validate-cover/
Request samples

PayloadPythonRubyNodeJavaJavascriptcURL
Content type
application/json

Copy
{
„source_url“: „https://www.dropbox.com/sh/p3zh22vzsaegiri/AADP367j0bTWlt8fCu-_tm2ia/161025/139056_cover.pdf?dl=1“,
„pod_package_id“: „0600X0900BWSTDPB060UW444MXX“,
„interior_page_count“: 210
}
Response samples

201400401403
Content type
application/json

Copy
{
„id“: 1,
„source_url“: „https://www.dropbox.com/sh/p3zh22vzsaegiri/AADP367j0bTWlt8fCu-_tm2ia/161025/139056_cover.pdf?dl=1“,
„page_count“: 210,
„errors“: null,
„status“: „NORMALIZING“
}
Retrieve a single cover validation record

Retrieve a single cover validation record
AUTHORIZATIONS:
oauth2
PATH PARAMETERS

id
required
integer
Example: 1
Id of the resource
Responses

200 OK
401 Unauthorized
403 Forbidden
404 Not Found

GET
/validate-cover/{id}/
Request samples

PythonRubyNodeJavaJavascriptcURL

Copy
import requests

url = „https://api.lulu.com/validate-cover/{id}/„

payload = {}
headers = {
  ‚Authorization‘: ‚Check Authentication menu‘,
  ‚Cache-Control‘: ‚no-cache‘
}

response = requests.request(„GET“, url, headers=headers, data=payload)

print(response.text)
Response samples

200401403404
Content type
application/json

Copy
{
„id“: 1,
„source_url“: „https://www.dropbox.com/sh/p3zh22vzsaegiri/AADP367j0bTWlt8fCu-_tm2ia/161025/139056_cover.pdf?dl=1“,
„page_count“: 210,
„errors“: null,
„status“: „NORMALIZING“