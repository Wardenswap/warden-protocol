# Warden Swap - The Best Rate BSC Swap

## How it works?

![cover](https://raw.githubusercontent.com/Wardenswap/warden-protocol/main/images/cover.png)

Wardenswap is not just another decentralized exchange (DEX). As someone might have noticed, When you trade on Wardenswap, you will receive a much better price than any other DEXs. Besides that, If there is another pool that has a price ready to be arbitraged. Wardenswap will also take the deal for you. Wardenswap is not just an exchange. Wardenswap is the gateway to all decentralized exchanges on the earth. This is how it works.

Nowadays, AMM is the state of the art of decentralized exchange since the order book system will not work if the market is illiquid and all transactions on the blockchain cost you some gas. No one really wants to pay unnecessary gas to make an offer not knowing if their offer will be matched or not.
Well, this is how AMM solves the problem. By allowing token holders to provide their assets as liquidity into the pool to earn transaction fees on every transaction made to the pool.
An AMM uses a mathematical formula that takes into account the current liquidity of a trading pair and gives an instant quote to traders. In other words, instead of referring to an order book to get a price, you’ll get it as a result of an algorithm. 
All DEX on Binance Smart Chain is AMM. But everything comes with a price. AMM solved a considerable obstacle that has been the primary source of concern for many DEXs — illiquidity. However, it brought a set of new problems, such as high slippage and impermanent loss for liquidity providers.

Here comes the solution. Wardenswap prices from multiple pools to find the best price across all pools. Not only that, Wardenswap also split trading amounts across multiple routes in a single transaction to make the trade make an even better price as you can see in the following image:

![submit-swap](https://raw.githubusercontent.com/Wardenswap/warden-protocol/main/images/send-trade.png)

For example, if a user wants to trade BNB into BUSD but their trade will make a high price impact on a single pool. Wardenswap will split the trade into 2 different routes and trade 2 pools simultaneously. (This can be up to any number of pools!). So the bigger the DEX market be, the better price Wardenswap will provide.

![receive-swap](https://raw.githubusercontent.com/Wardenswap/warden-protocol/main/images/receive-trade.png)

More than that, Wardenswap can also find deep routing if there is an in-between route to make the price even better, Wardenswap will include it in-between the transaction automatically.

![deep-route](https://raw.githubusercontent.com/Wardenswap/warden-protocol/main/images/deep-route.png)

For example, if a user wants to trade BNB into BUSD. But there is an in-between WAD-BNB route that can make this trade even better(Even if that pair is on another pool!). Wardenswap will convert BNB to WAD in Warden Pool and convert WAD to BUSD in Bekery Pool.

In another word, Wardenswap auto arbitrage the entire market for you.
Please note that all of this happens on-chain in a single atomic transaction. Wasn’t that a cool human? But if you think this is already cool, there are a lot of jaw-dropping features waiting to be released soon.


## Install
- npm install

## Compile
- npm run compile

## Test
- npm run test

## Test Coverage
- npm run test:coverage

## Run scripts
- npx hardhat run scripts/sample-script.ts

