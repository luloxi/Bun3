"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Address as AddressType, getAddress, isAddress } from "viem";
import { hardhat } from "viem/chains";
import { normalize } from "viem/ens";
import { useEnsAvatar, useEnsName } from "wagmi";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

type AddressProps = {
  address?: AddressType;
  disableAddressLink?: boolean;
  format?: "short" | "long";
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
};

const blockieSizeMap = {
  xs: 6,
  sm: 7,
  base: 8,
  lg: 9,
  xl: 10,
  "2xl": 12,
  "3xl": 15,
};

/**
 * Displays an address (or ENS) with a Blockie image and option to copy address.
 */
export const ProfileAddress = ({ address, disableAddressLink, format, size = "base" }: AddressProps) => {
  // const [ens, setEns] = useState<string | null>();
  const [ensAvatar, setEnsAvatar] = useState<string | null>();
  const checkSumAddress = address ? getAddress(address) : undefined;

  const { targetNetwork } = useTargetNetwork();

  const { data: profileInfo } = useScaffoldReadContract({
    contractName: "ProfileInfo",
    functionName: "profiles",
    args: [address],
    watch: true,
  });

  const { data: fetchedEns } = useEnsName({
    address: checkSumAddress,
    chainId: 1,
    query: {
      enabled: isAddress(checkSumAddress ?? ""),
    },
  });
  const { data: fetchedEnsAvatar } = useEnsAvatar({
    name: fetchedEns ? normalize(fetchedEns) : undefined,
    chainId: 1,
    query: {
      enabled: Boolean(fetchedEns),
      gcTime: 30_000,
    },
  });

  // We need to apply this pattern to avoid Hydration errors.
  // useEffect(() => {
  //   setEns(fetchedEns);
  // }, [fetchedEns]);

  useEffect(() => {
    setEnsAvatar(fetchedEnsAvatar);
  }, [fetchedEnsAvatar]);

  // Skeleton UI
  if (!checkSumAddress) {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="rounded-md bg-slate-300 h-6 w-6"></div>
        <div className="flex items-center space-y-6">
          <div className="h-2 w-28 bg-slate-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAddress(checkSumAddress)) {
    return <span className="text-error">Wrong address</span>;
  }

  let displayAddress = checkSumAddress?.slice(0, 6) + "..." + checkSumAddress?.slice(-4);

  // else if (ens) {
  //   displayAddress = ens;
  // }

  if (profileInfo && profileInfo[0] !== "") {
    displayAddress = profileInfo[0];
  } else if (format === "long") {
    displayAddress = checkSumAddress;
  }

  return (
    <div className="flex items-center flex-shrink-0">
      <div className="flex-shrink-0">
        <BlockieAvatar
          address={checkSumAddress}
          ensImage={ensAvatar}
          size={(blockieSizeMap[size] * 24) / blockieSizeMap["base"]}
        />
      </div>
      {disableAddressLink ? (
        <span className={`ml-1.5 text-${size} font-normal`}>{displayAddress}</span>
      ) : targetNetwork.id === hardhat.id ? (
        <span className={`ml-1.5 text-${size} font-normal`}>
          <Link href={`/profile/${checkSumAddress}`} passHref>
            {displayAddress}
          </Link>
        </span>
      ) : (
        <div className={`ml-1.5 text-${size} font-normal`}>
          <Link href={`/profile/${checkSumAddress}`} passHref>
            {displayAddress}
          </Link>
        </div>
      )}
    </div>
  );
};
