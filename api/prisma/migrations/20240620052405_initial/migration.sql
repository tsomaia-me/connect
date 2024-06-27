-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('COIN', 'TOKEN', 'PAYMENT', 'AD_VIEW', 'SOLUTION');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TRANSFER', 'OFFER', 'ACCEPT', 'CANCEL', 'REJECT');

-- CreateTable
CREATE TABLE "Transaction" (
    "hash" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "sender" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "previousTransactionHash" TEXT,
    "signature" TEXT NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "TransactionInput" (
    "hash" TEXT NOT NULL,
    "outputHash" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "TransactionInput_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "TransactionCondition" (
    "hash" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "metadata" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "TransactionCondition_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "TransactionOutput" (
    "hash" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "metadata" TEXT,
    "transactionHash" TEXT NOT NULL,

    CONSTRAINT "TransactionOutput_pkey" PRIMARY KEY ("hash")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_previousTransactionHash_key" ON "Transaction"("previousTransactionHash");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionInput_transactionHash_outputHash_key" ON "TransactionInput"("transactionHash", "outputHash");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_previousTransactionHash_fkey" FOREIGN KEY ("previousTransactionHash") REFERENCES "Transaction"("hash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionInput" ADD CONSTRAINT "TransactionInput_outputHash_fkey" FOREIGN KEY ("outputHash") REFERENCES "TransactionOutput"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionInput" ADD CONSTRAINT "TransactionInput_transactionHash_fkey" FOREIGN KEY ("transactionHash") REFERENCES "Transaction"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionCondition" ADD CONSTRAINT "TransactionCondition_transactionHash_fkey" FOREIGN KEY ("transactionHash") REFERENCES "Transaction"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionOutput" ADD CONSTRAINT "TransactionOutput_transactionHash_fkey" FOREIGN KEY ("transactionHash") REFERENCES "Transaction"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;
