// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";
// Solidity does not use decimal places just add 1e18 to make them equal esp if using ether
error FundMe__notOwner();

// NatSpec
/** @title  A contract for crowdfunding
 * @author Omodun Ayodele
 * @notice This contract is to demo a sample funding contract
 * @dev This implements price feeds as library
 */
contract FundMe {
    using PriceConverter for uint256;

    uint public constant MINIMUM_USD = 50 * 1e18;
    mapping(address => uint256) private addressToAmountFunded;

    address payable private immutable i_owner;

    address[] private s_funders;

    AggregatorV3Interface private s_priceFeed;

    modifier onlyOwner() {
        //require(msg.sender == i_owner, "Must be  owner.");
        if (msg.sender != i_owner) {
            revert FundMe__notOwner();
        }
        _;
    }

    constructor(address priceFeedAddress) {
        i_owner = payable(msg.sender);
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    function fund() public payable {
        require(
            msg.value.getConvertionRate(s_priceFeed) >= MINIMUM_USD,
            "Not enough funds"
        );
        s_funders.push(msg.sender);
        addressToAmountFunded[msg.sender] = msg.value;
    }

    function withdrawAll() public onlyOwner {
        address[] memory funders = s_funders;
        for (
            uint256 fundersIndex = 0;
            fundersIndex < funders.length;
            fundersIndex++
        ) {
            address funder = funders[fundersIndex];
            addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);
        (bool transactionStatus, ) = i_owner.call{value: address(this).balance}(
            ""
        );
        require(transactionStatus, "Transaction failed, try again.");
        /* since we don't need  //bytes memory dataReturned\\ i deleted it but left the space.*/
    }

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunders(uint256 funderIndex) public view returns (address) {
        return s_funders[funderIndex];
    }

    function getAddressToAmountFunded(
        address _funder
    ) public view returns (uint256) {
        return addressToAmountFunded[_funder];
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return s_priceFeed;
    }
}
