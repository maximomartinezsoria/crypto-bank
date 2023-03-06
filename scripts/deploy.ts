import { Contract } from 'ethers';
import * as fs from 'fs';
import { ethers } from 'hardhat';

async function main() {
	const Bank = await ethers.getContractFactory('Bank');
	const bank = await Bank.deploy();

	await bank.deployed();

	writeDeploymentInfo(bank);
}

async function writeDeploymentInfo(contract: Contract) {
	const signerAddress = await contract.signer.getAddress();
	const data = {
		contract: {
			address: contract.address,
			signerAddress,
			abi: contract.interface.format(),
		},
	};

	const content = JSON.stringify(data, null, 2);

	fs.writeFile(
		'deployment.json',
		content,
		{
			encoding: 'utf-8',
		},
		console.log
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
