pragma solidity ^0.4.18;

import "../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/zeppelin-solidity/contracts/lifecycle/Destructible.sol";

contract Splitter is Destructible {
    using SafeMath for uint256;
    
    uint256 public constant MAX_SPLIT_RECIPIENTS = 256;
    
    event LogSplit(address indexed sender, uint256 amount);
    event LogNewSplitRecipient(address indexed splitSender, address indexed splitRecipient);
    event LogWithdrawal(address indexed withdrawer, uint256 amount);
    
    mapping(address => Member) public members;
    
    struct Member {
        uint256 balance;
        address[] splitRecipients;
        mapping(address => bool) addedRecipients;
    }
    
    function getContractBalance() public view returns(uint256) {
        return address(this).balance;
    }
    
    function getMemberBalance(address _memberAddress) public view returns(uint256) {
        return members[_memberAddress].balance;
    }

    function split() public payable {
        require(members[msg.sender].splitRecipients.length > 0);
        require(msg.value >= members[msg.sender].splitRecipients.length);
        
        uint256 remainder = msg.value % members[msg.sender].splitRecipients.length;
        uint256 toSend = msg.value.div(members[msg.sender].splitRecipients.length);
        
        members[msg.sender].balance = members[msg.sender].balance.add(remainder);
        
        for (uint256 i = 0; i < members[msg.sender].splitRecipients.length; i++) {
            address recipientAddress = members[msg.sender].splitRecipients[i];
            members[recipientAddress].balance = members[recipientAddress].balance.add(toSend);
        }
        
        emit LogSplit(msg.sender, msg.value);
    }
    
    function addSplitRecipient(address _splitRecipientAddress) public {
        require(_splitRecipientAddress != address(0) && _splitRecipientAddress != msg.sender);
        require(!members[msg.sender].addedRecipients[_splitRecipientAddress]);
        require(members[msg.sender].splitRecipients.length <= MAX_SPLIT_RECIPIENTS);
        
        members[msg.sender].addedRecipients[_splitRecipientAddress] = true;
        members[msg.sender].splitRecipients.push(_splitRecipientAddress);
        
        emit LogNewSplitRecipient(msg.sender, _splitRecipientAddress);
    }
    
    function withdraw(uint256 _amount) public {
        require(members[msg.sender].balance >= _amount);
        
        members[msg.sender].balance = members[msg.sender].balance.sub(_amount);
        msg.sender.transfer(_amount);
        
        emit LogWithdrawal(msg.sender, _amount);
    }
}