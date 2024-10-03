// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ICryptoToken } from "../src/tokens/ICryptoToken.sol";
import "forge-std/console.sol";
import "forge-std/Test.sol";
import { ProxyAdmin } from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import { TransparentUpgradeableProxy } from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20Complete is IERC20 {
    function decimals() external view returns (uint8);

    function symbol() external view returns (string memory);

    function name() external view returns (string memory);

    function burn(uint256) external;
}

contract ICryptoTokenTest is Test {
    address private account1 = 0xf89d7b9c864f589bbF53a82105107622B35EaA40;

    address private proxyAdmin;
    address private proxy;
    address private implementation;
    IERC20Complete private icrypto;

    function setUp() public {
        vm.startPrank(account1);
        implementation = address(new ICryptoToken());
        proxyAdmin = address(new ProxyAdmin(msg.sender));
        proxy = address(
            new TransparentUpgradeableProxy(implementation, proxyAdmin, abi.encodeWithSelector(0x8129fc1c))
        );
        icrypto = IERC20Complete(proxy);
        vm.stopPrank();
    }

    function test_Symbol_Name_Decimals() public view {
        assertEq(icrypto.decimals(), 18);
        assertEq(icrypto.name(), "iCrypto");
        assertEq(icrypto.symbol(), "ICR");
    }

    function test_Total_Supply() public view {
        assertEq(icrypto.balanceOf(account1), 100_000_000 * 1e18);
        assertEq(icrypto.totalSupply(), 100_000_000 * 1e18);
    }

    function test_Burn() public {
        vm.prank(account1);
        icrypto.burn(1_000 * 1e18);

        assertEq(icrypto.totalSupply(), (100_000_000 - 1_000) * 1e18);
        assertEq(icrypto.balanceOf(account1), (100_000_000 - 1_000) * 1e18);
    }
}
