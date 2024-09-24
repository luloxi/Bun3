import { useState } from "react";
import Image from "next/image";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { AddressInput, InputBase } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { NFTMetaData } from "~~/utils/simpleNFT/nftsMetadata";

export interface Collectible extends Partial<NFTMetaData> {
  id: number;
  uri: string;
  owner: string;
}

export const CollectibleView = ({ nft }: { nft: Collectible }) => {
  const [transferToAddress, setTransferToAddress] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [NFTPrice, setNFTPrice] = useState("");
  const [payableCurrency, setPayableCurrency] = useState("0"); // "0" for ETH, "1" for USDC
  const [isAuction, setIsAuction] = useState(false);
  const [biddingTimeDays, setBiddingTimeDays] = useState(0);
  const [biddingTimeHours, setBiddingTimeHours] = useState(0);
  const [biddingTimeMinutes, setBiddingTimeMinutes] = useState(0);
  const [biddingTimeSeconds, setBiddingTimeSeconds] = useState(0);

  const { address: connectedAddress } = useAccount();

  const { writeContractAsync: MockERC721WriteContractAsync } = useScaffoldWriteContract("MockNFT");
  const { writeContractAsync: MarketplaceWriteContractAsync } = useScaffoldWriteContract("Marketplace");
  const { data: mockERC721Data } = useDeployedContractInfo("MockNFT");
  const { data: marketplaceData } = useDeployedContractInfo("Marketplace");

  const { data: isApproved } = useScaffoldReadContract({
    contractName: "MockNFT",
    functionName: "getApproved",
    args: [BigInt(nft.id.toString())],
  });

  const handleApprove = async () => {
    try {
      await MockERC721WriteContractAsync({
        functionName: "approve",
        args: [marketplaceData?.address, BigInt(nft.id.toString())],
      });
    } catch (err) {
      console.error("Error calling transferFrom function", err);
    }
  };

  const handleTransfer = async () => {
    try {
      await MockERC721WriteContractAsync({
        functionName: "transferFrom",
        args: [nft.owner, transferToAddress, BigInt(nft.id.toString())],
      });
    } catch (err) {
      console.error("Error calling transferFrom function", err);
    }
  };

  const calculateBiddingTimeInSeconds = () => {
    return biddingTimeDays * 86400 + biddingTimeHours * 3600 + biddingTimeMinutes * 60 + biddingTimeSeconds;
  };

  const handleCreateListing = async () => {
    try {
      const totalBiddingTime = calculateBiddingTimeInSeconds();
      let priceInSmallestUnit;

      // Convert price based on currency type
      if (payableCurrency === "0") {
        // ETH: Convert to wei
        priceInSmallestUnit = parseEther(NFTPrice.toString());
      } else {
        // USDC: Convert to smallest unit by multiplying by 10^6 (for 6 decimals)
        priceInSmallestUnit = BigInt(Math.floor(parseInt(NFTPrice) * 1e6).toString());
      }

      await MarketplaceWriteContractAsync({
        functionName: "createListing",
        args: [
          mockERC721Data?.address,
          BigInt(nft.id.toString()),
          priceInSmallestUnit, // Use the correct price based on currency
          parseInt(payableCurrency),
          isAuction,
          BigInt(totalBiddingTime.toString()),
        ],
      });
    } catch (err) {
      console.error("Error calling createListing function", err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col items-center">
        {/* Image Section */}
        <figure className="relative w-full max-w-md">
          <Image
            src={nft.image || "/path/to/default/image.png"}
            alt="NFT Image"
            className="w-full h-auto rounded-lg object-cover"
            layout="responsive"
            width={300}
            height={300}
          />
        </figure>

        {/* Tabs navigation */}
        <div className="tabs flex justify-center gap-3 border-b-4 border-base-200 mt-4">
          <a
            className={`tab ${activeTab === "details" ? "bg-blue-900 text-white" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            Details
          </a>
          {connectedAddress === nft.owner && (
            <a
              className={`tab ${activeTab === "sellNFT" ? "bg-red-800 text-white" : ""}`}
              onClick={() => setActiveTab("sellNFT")}
            >
              Sell NFT
            </a>
          )}
        </div>

        {activeTab === "details" && (
          <div className="card-body space-y-3">
            <div className="flex items-center justify-center">
              <p className="text-xl p-0 m-0 font-semibold">{nft.name}</p>
              <div className="flex flex-wrap space-x-2 mt-1">
                {nft.attributes?.map((attr, index) => (
                  <span key={index} className="badge badge-primary py-3">
                    {attr.value}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-center mt-1">
              <p className="my-0 text-lg">{nft.description}</p>
            </div>
            {nft.animation_url && (
              <video controls className="w-full h-14">
                <source src={nft.animation_url} type="audio/mpeg" />
              </video>
            )}
            <div className="flex flex-col justify-center mt-1">
              <span className="text-lg">
                <strong>Id:</strong> {nft.id}
              </span>
            </div>

            <div className="flex flex-col my-2 space-y-1">
              <span className="text-lg font-semibold mb-1">Transfer To: </span>
              <AddressInput
                value={transferToAddress}
                placeholder="receiver address"
                onChange={newValue => setTransferToAddress(newValue)}
              />
            </div>
            <div className="card-actions justify-end">
              <button className="cool-button" onClick={handleTransfer}>
                Transfer
              </button>
            </div>
          </div>
        )}

        {activeTab === "sellNFT" && (
          <div className="card-body">
            {/* Payable Currency Toggle */}
            <div className="form-control">
              <span className="label-text font-semibold">Currency</span>
              <label className="label cursor-pointer items-center flex flex-row">
                <span>{payableCurrency === "0" ? "ETH" : "USDC"}</span>
                <input
                  type="checkbox"
                  className="toggle toggle-accent"
                  checked={payableCurrency === "1"}
                  onChange={() => setPayableCurrency(payableCurrency === "0" ? "1" : "0")}
                />
              </label>
            </div>

            {/* NFT Price Input */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Price</span>
              </label>
              <InputBase placeholder="Enter price" value={NFTPrice} onChange={setNFTPrice} />
            </div>

            {/* Auction Toggle */}
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text font-semibold">Auction</span>
                <input
                  type="checkbox"
                  className="toggle toggle-accent"
                  checked={isAuction}
                  onChange={() => setIsAuction(!isAuction)}
                />
              </label>
            </div>

            {/* Bidding Time Input */}
            {isAuction && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Bidding Time</span>
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row">
                    <p>Days</p>
                    <input
                      type="number"
                      className="input input-bordered max-w-24"
                      placeholder="Days"
                      value={biddingTimeDays}
                      onChange={e => setBiddingTimeDays(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex flex-row">
                    <p>Hours</p>
                    <input
                      type="number"
                      className="input input-bordered max-w-24"
                      placeholder="Hours"
                      value={biddingTimeHours}
                      onChange={e => setBiddingTimeHours(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex flex-row">
                    <p>Minutes</p>
                    <input
                      type="number"
                      className="input input-bordered max-w-24"
                      placeholder="Minutes"
                      value={biddingTimeMinutes}
                      onChange={e => setBiddingTimeMinutes(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex flex-row">
                    <p>Seconds</p>
                    <input
                      type="number"
                      className="input input-bordered max-w-24"
                      placeholder="Seconds"
                      value={biddingTimeSeconds}
                      onChange={e => setBiddingTimeSeconds(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Create Listing Button */}
            <div className="card-actions justify-end">
              {marketplaceData && isApproved && isApproved.toLowerCase() == marketplaceData.address ? (
                <button className="cool-button" onClick={handleCreateListing}>
                  List for sale
                </button>
              ) : (
                <button className="cool-button" onClick={handleApprove}>
                  Approve NFT
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
