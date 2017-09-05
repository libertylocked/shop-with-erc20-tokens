const BigNumber = require("bignumber.js");
const HumanStandardToken = artifacts.require("./HumanStandardToken.sol");
const Shop = artifacts.require("./Shop.sol");

contract("Shop", (accounts) => {
  describe("constructor", () => {
    it("should have the correct owner set", () => {
      return Shop.deployed()
        .then((instance) => {
          return instance.owner();
        })
        .then((owner) => {
          assert.equal(owner, accounts[0]);
        })
    })
  })

  describe("addProduct", () => {
    let instance;
    beforeEach("Create a new Shop", () => {
      return Shop.new()
        .then((_instance) => {
          instance = _instance;
        })
    })

    it("should add the product to listing if not listed", () => {
      return instance.addProduct(0, "oreo", 10)
        .then((txObj) => {
          assert.equal(txObj.logs[0].args.id.toString(), new BigNumber(0).toString());
          return instance.products(0);
        })
        .then((product) => {
          assert.equal(product[0], "oreo");
          assert.equal(product[1].toString(), new BigNumber(10).toString());
          assert.equal(product[2], true);
        })
    })
  })

  describe("setPrice", () => {
    let instance;
    beforeEach("Create a new shop and add a product with ID 0", () => {
      return Shop.new()
        .then((_instance) => {
          instance = _instance;
          return instance.addProduct(0, "oreo", 10)
        })
        .then((txObj) => {
          assert.equal(txObj.logs[0].args.id.toString(), new BigNumber(0).toString());
        })
    });

    it("should not have any price set before setPrice is called", () => {
      return instance.getProductPrice(0, "0x0000000000000000000000000000000000000001")
        .then((price) => {
          assert.equal(price.toString(), new BigNumber(0).toString());
        })
    });

    it("should set the price if is owner and product exists", () => {
      return instance.setPrice(0, "0x0000000000000000000000000000000000000001", 50)
        .then((txObj) => {
          assert.equal(txObj.logs[0].args.id.toString(), new BigNumber(0).toString());
          assert.equal(txObj.logs[0].args.token.toString(), "0x0000000000000000000000000000000000000001");
          assert.equal(txObj.logs[0].args.price.toString(), new BigNumber(50).toString());
          return instance.getProductPrice(0, "0x0000000000000000000000000000000000000001")
        })
        .then((price) => {
          assert.equal(price.toString(), new BigNumber(50).toString())
        })
    })
  })

  describe("buyWithTokens when there is stock", () => {
    let shopInstance;
    let token1Instance, token2Instance;

    const TOKEN1_PRICE = new BigNumber(150),
      TOKEN2_PRICE = new BigNumber(350);

    const OWNER = accounts[0];
    const BUYER = accounts[1];

    beforeEach("Create a new Shop", () => {
      return Shop.new()
        .then((instance) => {
          shopInstance = instance;
        })
    })

    beforeEach("Create 2 new tokens and client tokens", () => {
      return HumanStandardToken.new(10000, "Shop Token One", 18, "ST1", {
          from: BUYER
        })
        .then((instance) => {
          token1Instance = instance;
          return HumanStandardToken.new(20000, "Shop Token Two", 18, "ST2", {
            from: BUYER
          })
        })
        .then((instance) => {
          token2Instance = instance;
        })
    })

    beforeEach("Add a product with ID 0, set prices for the 2 tokens", () => {
      return shopInstance.addProduct(0, "oreo", 100)
        .then((txObj) => {
          assert.equal(txObj.logs[0].args.id.toString(), new BigNumber(0).toString());
          assert.equal(txObj.logs[0].args.stock.toString(), new BigNumber(100).toString());
          // set price for token 1
          return shopInstance.setPrice(0, token1Instance.address, TOKEN1_PRICE);
        })
        .then((txObj) => {
          assert.equal(txObj.logs[0].args.id.toString(), new BigNumber(0).toString());
          assert.equal(txObj.logs[0].args.token.toString(), token1Instance.address);
          assert.equal(txObj.logs[0].args.price.toString(), TOKEN1_PRICE.toString());
          // set price for token 2
          return shopInstance.setPrice(0, token2Instance.address, TOKEN2_PRICE);
        })
        .then((txObj) => {
          assert.equal(txObj.logs[0].args.id.toString(), new BigNumber(0).toString());
          assert.equal(txObj.logs[0].args.token.toString(), token2Instance.address);
          assert.equal(txObj.logs[0].args.price.toString(), TOKEN2_PRICE.toString());
        })
    })

    it("shouln't let client buy before giving shop allowance", (done) => {
      shopInstance.buyWithTokens(BUYER, TOKEN1_PRICE, token1Instance.address, 0, {
          from: BUYER
        })
        .then((txObj) => {
          done(new Error("Buy order placed but contract didn't receive tokens"));
        })
        .catch((err) => {
          done();
        })
    })

    it("should place buy order if client has given shop allowance", () => {
      // give shop allowance of the exact price
      return token1Instance.approve(shopInstance.address, TOKEN1_PRICE, {
          from: BUYER
        })
        .then((txObj) => {
          assert.equal(txObj.logs[0].args._owner, BUYER);
          assert.equal(txObj.logs[0].args._spender, shopInstance.address);
          assert.equal(txObj.logs[0].args._value.toString(), TOKEN1_PRICE.toString());
          return shopInstance.buyWithTokens(BUYER, TOKEN1_PRICE, token1Instance.address, 0, {
            from: BUYER
          });
        })
        .then((txObj) => {
          assert.equal(txObj.logs[0].args.id.toString(), new BigNumber(0).toString());
          assert.equal(txObj.logs[0].args.buyer, BUYER);
          // check inventory
          return shopInstance.products(0)
        })
        .then((product) => {
          assert.equal(product[0], "oreo");
          assert.equal(product[1].toString(), new BigNumber(99).toString());
          // check store owner's token wallet
          return token1Instance.balanceOf(OWNER);
        })
        .then((balance) => {
          assert.equal(balance.toString(), TOKEN1_PRICE.toString());
        })
    });
  })
});
