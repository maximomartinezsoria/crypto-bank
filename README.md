# Crypto Bank


## Features
Crypto bank is a smart contract that allows users to create a bank account, and deposit and withdraw money from it.

* User can create an account alone
* User can create an account with co-owners
* Anybody can deposit to an account
* Owners can request a withdraw from their accounts
  * If the account has co-owners, each of them should approve the request before the withdraw can be executed.


## Installation

1. Clone repository
2. Start local node: `yarn start`
3. Deploy contract: `yarn deploy`
4. Find the ABI information in `deployment.json`


## Testing

Tests are placed in `test/Bank.ts`.

Run tests with:
```
yarn test
```
