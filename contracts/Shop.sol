pragma solidity 0.4.15;

import "./ERC20Interface.sol";
import "./ERC20RecipientInterface.sol";

contract Shop is ERC20RecipientInterface {
    struct Product {
        // name of the product
        string name;
        // product stock in inventory
        uint stock;
        // a flag for checking if the product exists
        bool exists;
        // price in tokens. key is the token contract address, value is the price
        // for that token
        mapping(address => uint) price;
    }
    
    event LogProductListed(uint id, uint stock);
    event LogProductPriceSet(uint id, address token, uint price);
    event LogProductRestocked(uint id, uint stock);
    event LogOrderPlaced(uint id, address buyer, address token, uint price);
    event LogDebug(string debug);
    
    address public owner;
    mapping(uint => Product) public products;
    
    
    modifier requireOwner() {
        require(msg.sender == owner);
        _;
    }
    
    modifier requireProductExists(uint id) {
        require(products[id].exists);
        _;
    }
    
    modifier requireProductNotExists(uint id) {
        require(!products[id].exists);
        _;
    }
    
    modifier requireProductInStock(uint id) {
        require(products[id].stock > 0);
        _;
    }
    
    /// Constructor
    /// Opens the shop!
    function Shop() {
        owner = msg.sender;
    }
    
    // ====================================
    //  All the inventory management stuff
    // ====================================
    
    /// Creates a product listing
    /// @param id Product ID. Cannot be an ID already in inventory
    /// @param name Product name
    /// @param stock Initial stock
    function addProduct(uint id, string name, uint stock)
        requireOwner()
        requireProductNotExists(id)
        returns (bool)
    {
        require(!products[id].exists); // cannot list a product with duplicate ID
        products[id] = Product({
            name: name,
            stock: stock,
            exists: true
        });
        LogProductListed(id, stock);
        return true;
    }
    
    /// Restocks an existing product
    /// @param id Product ID
    /// @param stock Restock amount
    function restockProduct(uint id, uint stock)
        requireOwner()
        requireProductExists(id)
        returns (bool)
    {
        products[id].stock += stock;
        LogProductRestocked(id, products[id].stock);
        return true;
    }
    
    /// Sets the price for a product
    /// @param tokenAddress The address of a token contract
    /// @param price The price in that token
    function setPrice(uint id, address tokenAddress, uint price) 
        requireOwner()
        requireProductExists(id)
        returns (bool)
    {
        Product storage product = products[id];
        product.price[tokenAddress] = price;
        LogProductPriceSet(id, tokenAddress, price);
        return true;
    }
    
    // ==================
    //  Making purchases
    // ==================
    
    /// Places an order
    /// Requires the buyer to give shop allowance first.
    /// i.e. the client should call `approve` on the token contract with sufficient value,
    /// before calling `buyWithToken` on shop.
    /// This function can either be called directly by the buyer (after giving allowance),
    /// or be called from `receiveApproval` by the token contract.
    /// @param _buyer The buyer who gave us allowance
    /// @param _value The allowance stated by the buyer. Should not be trusted.
    /// @param _token The address of the token
    /// @param id The product buyer wants to buy
    function buyWithTokens(address _buyer, uint256 _value, address _token, uint id)
        requireProductExists(id)
        requireProductInStock(id)
        returns (bool)
    {
        require(msg.sender == _buyer || msg.sender == _token);
        // get the price when buying with this token
        uint price = products[id].price[_token];
        // check if this token is accepted
        require(price >= 0);
        require(_value >= price); // XXX: may be trivial
        ERC20Interface token = ERC20Interface(_token);
        // check if we have the allowance
        require(token.allowance(_buyer, this) >= price);
        // transfer token from buyer to owner
        require(token.transferFrom(_buyer, owner, price));
        // place the order
        products[id].stock--;
        LogOrderPlaced(id, _buyer, _token, price);
        return true;
    }
    
    /// Implementation of ERC20 Recipient Interface
    /// This function gets called when our client decides to pay with tokens.
    /// The client would call `approveAndCall` on the token contract, which gives our
    /// shop contract some allowance, then the token contract calls this function.
    /// We will use the extra data field here as the product ID
    /// 
    /// Note that this isn't the only way client can buy stuff with tokens though.
    /// Client can give us allowance first, then place buy order
    ///
    /// @param _from The buyer's address
    /// @param _value The amount of tokens allocated to us
    /// @param _token The token address
    /// @param _extraData Extra data that is in approve and call
    function receiveApproval(address _from, uint256 _value, address _token, bytes _extraData)
        returns (bool)
    {
        // somehow convert extra data to 1 uint256
        // require(_extraData.length >= 32);
        // XXX: How do we decode the extra data?
        // return buyWithTokens(_from, _value, _token, 0);
        return false;
    }
    
    // ====================
    //  Constant functions
    // ====================
    function getProductPrice(uint id, address token) constant
        requireProductExists(id)
        returns (uint)
    {
        return products[id].price[token];
    }
}
