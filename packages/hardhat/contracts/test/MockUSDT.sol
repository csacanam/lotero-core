// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
	constructor() ERC20("MockUSDT", "MUSDT") {
		_mint(msg.sender, 1000000 * 10 ** 6); // Mint 1,000,000 MUSDT with 6 decimals
	}

	function decimals() public view override returns (uint8) {
		return 6;
	}
}
