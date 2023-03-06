pragma solidity ^0.8.9;

contract Bank {
    event Deposit(
        address indexed user,
        uint256 indexed accountId,
        uint256 value,
        uint256 timestamp
    );

    event WithdrawRequested(
        address indexed user,
        uint256 indexed accountId,
        uint256 indexed withdrawId,
        uint256 amount,
        uint256 timestamp
    );

    event Withdraw(uint256 indexed withdrawId, uint256 timestamp);

    event AccountCreated(
        address[] owners,
        uint256 indexed id,
        uint256 timestamp
    );

    struct WithdrawRequest {
        address user;
        uint256 amount;
        uint256 approvals;
        mapping(address => bool) ownersApproved;
        bool approved;
    }

    struct BankAccount {
        address[] owners;
        uint256 balance;
        mapping(uint256 => WithdrawRequest) withdrawRequests;
    }

    mapping(uint256 => BankAccount) accounts;
    mapping(address => uint256[]) userAccounts;

    uint256 nextAccountId;
    uint256 nextWithdrawId;

    modifier userIsOwner(uint256 accountId) {
        bool isOwner;

        for (uint256 idx; idx < accounts[accountId].owners.length; idx++) {
            if (accounts[accountId].owners[idx] == msg.sender) {
                isOwner = true;
            }
        }

        require(isOwner, "You must be an owner");
        _;
    }

    modifier validCoOwners(address[] calldata coOwners) {
        require(coOwners.length < 3, "There can only be 2 co-owners");

        for (uint256 i; i < coOwners.length; i++) {
            if (coOwners[i] == msg.sender) {
                revert("no duplicate owners");
            }

            for (uint256 j = i + 1; j < coOwners.length; j++) {
                if (coOwners[i] == coOwners[j]) {
                    revert("no duplicate owners");
                }
            }
        }
        _;
    }

    modifier accountExists(uint256 accountId) {
        require(
            accounts[accountId].owners.length > 0,
            "You must provide a valid account"
        );
        _;
    }

    modifier canWithdraw(uint256 accountId, uint256 withdrawId) {
        require(
            accounts[accountId].withdrawRequests[withdrawId].user == msg.sender,
            "You must be the owner of the request"
        );
        require(
            accounts[accountId].withdrawRequests[withdrawId].approved,
            "This request is not approved"
        );
        _;
    }

    modifier canApprove(uint256 accountId, uint256 withdrawId) {
        require(
            accounts[accountId].withdrawRequests[withdrawId].user != msg.sender,
            "You can't approve your own request"
        );
        _;
    }

    modifier sufficientBalance(uint256 accountId, uint256 amount) {
        require(accounts[accountId].balance > amount, "Insufficient balance");
        _;
    }

    function createAccount(address[] calldata coOwners)
        external
        payable
        validCoOwners(coOwners)
    {
        require(
            msg.value >= 0.005 ether,
            "The initial deposit should be at least 0.005 ether"
        );

        uint256 id = nextAccountId;

        address[] memory owners = new address[](coOwners.length + 1);
        owners[0] = msg.sender;
        userAccounts[msg.sender].push(id);

        for (uint8 idx = 1; idx < owners.length; idx++) {
            owners[idx] = coOwners[idx - 1];
            userAccounts[coOwners[idx - 1]].push(id);
        }

        accounts[id].owners = owners;
        accounts[id].balance = msg.value;
        nextAccountId++;

        emit AccountCreated(owners, id, block.timestamp);
    }

    function deposit(uint256 accountId)
        external
        payable
        accountExists(accountId)
    {
        accounts[accountId].balance += msg.value;

        emit Deposit(msg.sender, accountId, msg.value, block.timestamp);
    }

    function withdraw(uint256 accountId, uint256 withdrawId)
        external
        userIsOwner(accountId)
        canWithdraw(accountId, withdrawId)
    {
        uint256 amount = accounts[accountId]
            .withdrawRequests[withdrawId]
            .amount;

        require(amount <= accounts[accountId].balance, "Insufficient balance");

        accounts[accountId].balance -= amount;
        delete accounts[accountId].withdrawRequests[withdrawId];

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent);

        emit Withdraw(withdrawId, block.timestamp);
    }

    function requestWithdrawl(uint256 accountId, uint256 amount)
        external
        userIsOwner(accountId)
        sufficientBalance(accountId, amount)
    {
        uint256 id = nextWithdrawId;
        WithdrawRequest storage request = accounts[accountId].withdrawRequests[
            id
        ];
        request.user = msg.sender;
        request.amount = amount;
        nextWithdrawId++;

        emit WithdrawRequested(
            msg.sender,
            accountId,
            id,
            amount,
            block.timestamp
        );
    }

    function approveWithdrawl(uint256 accountId, uint256 withdrawId)
        external
        userIsOwner(accountId)
        canApprove(accountId, withdrawId)
    {
        WithdrawRequest storage request = accounts[accountId].withdrawRequests[
            withdrawId
        ];
        request.ownersApproved[msg.sender] = true;
        request.approvals++;
        if (request.approvals == accounts[accountId].owners.length - 1) {
            request.approved = true;
        }
    }

    function getBalance(uint256 accountId) public view returns (uint256) {
        return accounts[accountId].balance;
    }

    function getOwners(uint256 accountId)
        public
        view
        returns (address[] memory)
    {
        return accounts[accountId].owners;
    }

    function getApprovals(uint256 accountId, uint256 withdrawId)
        public
        view
        returns (uint256)
    {
        return accounts[accountId].withdrawRequests[withdrawId].approvals;
    }

    function getAccounts() public view returns (uint256[] memory) {
        return userAccounts[msg.sender];
    }
}
