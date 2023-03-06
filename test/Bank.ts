import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { ethers } from 'hardhat';
import { expect } from 'chai';

const _0_05_ETHER_IN_WEI = '50000000000000000';
const _0_06_ETHER_IN_WEI = '60000000000000000';

describe('Bank', function () {
	async function deployBank() {
		const [addr0, addr1, addr2, addr3] = await ethers.getSigners();

		const Bank = await ethers.getContractFactory('Bank');
		const bank = await Bank.deploy();

		return { bank, addr0, addr1, addr2, addr3 };
	}

	async function deployBankWithAccounts(
		owners = 1,
		initialDeposit = _0_05_ETHER_IN_WEI
	) {
		const { bank, addr0, addr1, addr2, addr3 } = await loadFixture(deployBank);
		const addresses = [addr1.address, addr2.address, addr3.address];

		await bank
			.connect(addr0)
			.createAccount(addresses.slice(0, owners - 1), { value: initialDeposit });

		return { bank, addr0, addr1, addr2, addr3 };
	}

	describe('deployment', () => {
		it('should deploy without error', async () => {
			await loadFixture(deployBank);
		});
	});

	describe('Create an account', () => {
		it('should allow creating an account without co-owners', async () => {
			const { bank, addr0 } = await loadFixture(deployBank);
			await bank
				.connect(addr0)
				.createAccount([], { value: _0_05_ETHER_IN_WEI });

			const accounts = await bank.connect(addr0).getAccounts();

			expect(accounts.length).to.equal(1);
		});

		it('should allow creating an account with 2 owners', async () => {
			const { bank, addr0, addr1 } = await loadFixture(deployBank);
			await bank
				.connect(addr0)
				.createAccount([addr1.address], { value: _0_05_ETHER_IN_WEI });

			const accounts = await bank.connect(addr0).getAccounts();

			expect(accounts.length).to.equal(1);
		});

		it('should allow creating an account with 3 owners', async () => {
			const { bank, addr0, addr1, addr2, addr3 } = await loadFixture(
				deployBank
			);
			await bank.connect(addr0).createAccount([addr1.address, addr2.address], {
				value: _0_05_ETHER_IN_WEI,
			});

			const accounts = await bank.connect(addr0).getAccounts();

			expect(accounts.length).to.equal(1);
		});

		it('should not allow creating an account with 4 owners', async () => {
			const { bank, addr0, addr1, addr2, addr3 } = await loadFixture(
				deployBank
			);
			await expect(
				bank
					.connect(addr0)
					.createAccount([addr1.address, addr2.address, addr3.address], {
						value: _0_05_ETHER_IN_WEI,
					})
			).to.be.reverted;
		});

		it('should not allow creating an account with duplicate owners', async () => {
			const { bank, addr0, addr1 } = await loadFixture(deployBank);

			await expect(
				bank.connect(addr0).createAccount([addr1.address, addr1.address], {
					value: _0_05_ETHER_IN_WEI,
				})
			).to.be.reverted;
		});

		it('should not allow creating an account with less than the minimum deposit', async () => {
			const { bank, addr0, addr1 } = await loadFixture(deployBank);

			await expect(
				bank
					.connect(addr0)
					.createAccount([addr1.address, addr1.address], { value: '5000' })
			).to.be.reverted;
		});
	});

	describe('Depositing', () => {
		it('shoud allow deposit from account owner', async () => {
			const { bank, addr0 } = await deployBankWithAccounts();
			await expect(
				bank.connect(addr0).deposit(0, { value: '100' })
			).to.changeEtherBalances([bank, addr0], ['100', '-100']);
		});

		it('shoud allow deposit from non-account owner', async () => {
			const { bank, addr1 } = await deployBankWithAccounts();
			await expect(
				bank.connect(addr1).deposit(0, { value: '100' })
			).to.changeEtherBalances([bank, addr1], ['100', '-100']);
		});
	});

	describe('Withdraw', () => {
		describe('Request a withdraw', () => {
			it('should allow account owner to request a withdraw', async () => {
				const { bank, addr0 } = await deployBankWithAccounts();

				await bank.connect(addr0).requestWithdrawl(0, 1000);
			});

			it('should allow account co-owner to request a withdraw', async () => {
				const { bank, addr1 } = await deployBankWithAccounts(2);

				await bank.connect(addr1).requestWithdrawl(0, 1000);
			});

			it('should not allow to request a withdraw with invalid amount', async () => {
				const { bank, addr0 } = await deployBankWithAccounts();

				await expect(
					bank.connect(addr0).requestWithdrawl(0, _0_06_ETHER_IN_WEI)
				).to.be.reverted;
			});

			it('should not allow non-account owner to request a withdraw', async () => {
				const { bank, addr1 } = await deployBankWithAccounts();

				await expect(bank.connect(addr1).requestWithdrawl(0, 1000)).to.be
					.reverted;
			});
		});

		describe('Approve a withdraw', () => {
			it('should allow account owner to approve a withdraw', async () => {
				const { bank, addr0, addr1 } = await deployBankWithAccounts(2);

				await bank.connect(addr0).requestWithdrawl(0, 1000);
				await bank.connect(addr1).approveWithdrawl(0, 0);
				const approvals = await bank.connect(addr0).getApprovals(0, 0);

				expect(approvals).to.equal(1);
			});

			it('should not allow non-account owner to approve a withdraw', async () => {
				const { bank, addr0, addr1 } = await deployBankWithAccounts();

				await bank.connect(addr0).requestWithdrawl(0, 1000);
				await expect(bank.connect(addr1).approveWithdrawl(0, 0)).to.be.reverted;
			});

			it('should not allow account owner to approve their own withdrawl', async () => {
				const { bank, addr0 } = await deployBankWithAccounts();

				await bank.connect(addr0).requestWithdrawl(0, 1000);
				await expect(bank.connect(addr0).approveWithdrawl(0, 0)).to.be.reverted;
			});
		});

		describe('Make a withdraw', () => {
			it('should allow creator of request to withdraw approved request', async () => {
				const { bank, addr0, addr1 } = await deployBankWithAccounts(2);

				await bank.connect(addr0).requestWithdrawl(0, 100);
				await bank.connect(addr1).approveWithdrawl(0, 0);

				await expect(bank.connect(addr0).withdraw(0, 0)).to.changeEtherBalances(
					[bank, addr0],
					['-100', '100']
				);
			});

			it('should not allow creator of request to withdraw approved request twice', async () => {
				const { bank, addr0, addr1 } = await deployBankWithAccounts(2);

				await bank.connect(addr0).requestWithdrawl(0, 100);
				await bank.connect(addr1).approveWithdrawl(0, 0);

				await expect(bank.connect(addr0).withdraw(0, 0)).to.changeEtherBalances(
					[bank, addr0],
					['-100', '100']
				);
				await expect(bank.connect(addr0).withdraw(0, 0)).to.reverted;
			});

			it('should not allow creator of request to withdraw non-approved request', async () => {
				const { bank, addr0 } = await deployBankWithAccounts(2);

				await bank.connect(addr0).requestWithdrawl(0, 100);

				await expect(bank.connect(addr0).withdraw(0, 0)).to.be.reverted;
			});

			it('should not allow non-account owner to withdraw', async () => {
				const { bank, addr0, addr1 } = await deployBankWithAccounts();

				await bank.connect(addr0).requestWithdrawl(0, 1000);
				await expect(bank.connect(addr1).withdraw(0, 0)).to.be.reverted;
			});
		});
	});
});
