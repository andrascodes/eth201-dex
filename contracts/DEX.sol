pragma solidity 0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "./Wallet.sol";

contract DEX is Wallet {
    bytes32 private constant ETH = "ETH";

    enum Side {BUY, SELL}

    struct Order {
        uint256 id;
        address trader;
        Side side;
        bytes32 ticker;
        uint256 amount;
        uint256 price;
        uint256 filled;
    }

    uint256 public nextOrderId = 0;

    modifier sideExist(uint256 side) {
        require(
            side <= uint256(Side.SELL),
            "Wrong side parameter. Use 0 for 'BUY' or 1 for 'SELL'"
        );
        _;
    }

    mapping(bytes32 => mapping(Side => Order[])) public orderBook;

    function getOrderBook(bytes32 ticker, uint256 side)
        public
        view
        sideExist(side)
        returns (Order[] memory)
    {
        return orderBook[ticker][Side(side)];
    }

    function depositEth() public payable {
        balances[msg.sender][ETH] += msg.value;
    }

    function createMarketOrder(
        bytes32 ticker,
        uint256 side,
        uint256 amount
    ) public sideExist(side) tokenExists(ticker) {
        Side orderSide = Side(side);
        if (orderSide == Side.SELL) {
            require(
                balances[msg.sender][ticker] >= amount,
                "Insufficient balance"
            );
        }

        Side orderBookSide = orderSide == Side.BUY ? Side.SELL : Side.BUY;
        Order[] storage orders = orderBook[ticker][Side(orderBookSide)];

        uint256 totalFilled = 0;
        for (uint256 i = 0; i < orders.length && totalFilled < amount; i++) {
            uint256 leftToFill = amount - totalFilled;
            uint256 availableToFill = orders[i].amount - orders[i].filled;
            uint256 filled = 0;
            if (availableToFill > leftToFill) {
                filled = leftToFill;
            } else {
                filled = availableToFill;
            }
            totalFilled += filled;
            orders[i].filled += filled;

            uint256 ethCost = filled * orders[i].price;
            if (orderSide == Side.BUY) {
                // Verify that the buyer has enough ETH to cover (require)
                require(balances[msg.sender]["ETH"] >= ethCost);
                // Transfer ETH from Msg.Sender to Seller
                balances[msg.sender][ETH] -= ethCost;
                balances[orders[i].trader][ETH] += ethCost;
                // Transfer Tokens from Seller To Msg.Sender
                balances[orders[i].trader][orders[i].ticker] -= filled;
                balances[msg.sender][orders[i].ticker] += filled;
            } else if (orderSide == Side.SELL) {
                // Transfer Tokens from Msg.Sender To Buyer
                balances[msg.sender][orders[i].ticker] -= filled;
                balances[orders[i].trader][orders[i].ticker] += filled;
                // Transfer ETH from Buyer to Msg.Sender
                balances[orders[i].trader][ETH] -= ethCost;
                balances[msg.sender][ETH] += ethCost;
            }
        }

        // Loop through orderbook and remove 100% filled orders
        
        while( orders.length > 0 && orders[0].filled == orders[0].amount) {
            for(uint i = 0; i < orders.length - 1; i++) {
                orders[i] = orders[i+1];
            }
            orders.pop();
        }
    }

    function createLimitOrder(
        bytes32 ticker,
        uint256 side,
        uint256 amount,
        uint256 price
    ) public sideExist(side) tokenExists(ticker) {
        Side _side = Side(side);

        if (_side == Side.BUY) {
            require(
                balances[msg.sender][ETH] >= amount * price,
                "ETH balance is not sufficient"
            );
        } else if (_side == Side.SELL) {
            require(
                balances[msg.sender][ticker] >= amount,
                "Token balance is not sufficient"
            );
        }

        Order[] storage orders = orderBook[ticker][_side];

        orders.push(
            Order(nextOrderId, msg.sender, _side, ticker, amount, price, 0)
        );

        // Bubble sort
        if (_side == Side.BUY) {
            for (uint256 i = orders.length - 1; i > 0; i--) {
                if (orders[i].price > orders[i - 1].price) {
                    Order memory temp = orders[i - 1];
                    orders[i - 1] = orders[i];
                    orders[i] = temp;
                }
            }
        } else if (_side == Side.SELL) {
            for (uint256 i = 0; i < orders.length - 1; i++) {
                if (orders[i].price > orders[i + 1].price) {
                    Order memory temp = orders[i + 1];
                    orders[i + 1] = orders[i];
                    orders[i] = temp;
                }
            }
        }

        nextOrderId++;
    }
}
