const request = require("supertest");
const sinon = require("sinon");
const nock = require("nock");
const chai = require("chai");
const { initializeWebServer, stopWebServer } = require("../api-under-test");
const mailer = require("../libraries/mailer");
const OrderRepository = require("../data-access/order-repository");

const expect = chai.expect;

let expressApp;

before(async () => {
  // ️️️✅ Best Practice: Place the backend under test within the same process
  expressApp = await initializeWebServer();

  // ️️️✅ Best Practice: use a sandbox for test doubles for proper clean-up between tests

  // ️️️✅ Best Practice: Ensure that this component is isolated by preventing unknown calls
  nock.disableNetConnect();
  nock.enableNetConnect("127.0.0.1");

});

after(async () => {
  // ️️️✅ Best Practice: Clean-up resources after each run
  await stopWebServer();
});

beforeEach(() => {
  nock.cleanAll();
  nock("http://localhost/user/").get(`/1`).reply(200, {
    id: 1,
    name: "John",
  });
  sinon.restore();
  console.log = sinon.stub();
});

// ️️️✅ Best Practice: Structure tests
describe("/api", () => {
  describe("POST /orders", () => {
    // it.todo("When adding order without product, return 400");

    it("When adding an order without specifying product, stop and return 400", async () => {
      //Arrange
      nock("http://localhost/user/").get(`/1`).reply(200, {
        id: 1,
        name: "John",
      });
      const orderToAdd = {
        userId: 1,
        mode: "draft",
      };

      //Act
      const orderAddResult = await request(expressApp).post("/order").send(orderToAdd);

      //Assert
      expect(orderAddResult.status).to.equal(400);
    });

    it("When adding  a new valid order , Then should get back 200 response", async () => {
      //Arrange
      const orderToAdd = {
        userId: 1,
        productId: 2,
        mode: "approved",
      };
      nock("http://localhost/user/").get(`/1`).reply(200, {
        id: 1,
        name: "John",
      });

      //Act
      const receivedAPIResponse = await request(expressApp).post("/order").send(orderToAdd);

      //Assert
      const { status, body } = receivedAPIResponse;

      expect(status).to.equal(200);
      expect(body.mode).to.equal("approved");
    });

    it.only("When order failed, send mail to admin", async () => {
      //Arrange
      process.env.SEND_MAILS = "true";
      nock("http://localhost/user/").get(`/1`).reply(200, {
        id: 1,
        name: "John",
      });
      // ️️️✅ Best Practice: Intercept requests for 3rd party services to eliminate undesired side effects like emails or SMS
      // ️️️✅ Best Practice: Specify the body when you need to make sure you call the 3rd party service as expected
      const scope = nock("https://mailer.com")
        .post("/send", {
          subject: /^(?!\s*$).+/,
          body: /^(?!\s*$).+/,
          recipientAddress: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
        })
        .reply(202);
      sinon.stub(OrderRepository.prototype, "addOrder").throws(new Error("Unknown error"));
      const orderToAdd = {
        userId: 1,
        productId: 2,
        mode: "approved",
      };

      //Act
      await request(expressApp).post("/order").send(orderToAdd);

      //Assert
      // ️️️✅ Best Practice: Assert that the app called the mailer service appropriately
      expect(scope.isDone()).to.equal(true);
    });

    it("When the user does not exist, return http 404", async () => {
      //Arrange
      nock("http://localhost/user/").get(`/7`).reply(404, {
        message: "User does not exist",
        code: "nonExisting",
      });
      const orderToAdd = {
        userId: 7,
        productId: 2,
        mode: "draft",
      };

      //Act
      const orderAddResult = await request(expressApp).post("/order").send(orderToAdd);

      //Assert
      expect(orderAddResult.status).to.equal(404);
    });
  });

  describe("GET /orders", () => {
    it("When filtering for canceled orders, should show only relevant items", () => {
      expect(true).to.equal(true);
    });
  });
});