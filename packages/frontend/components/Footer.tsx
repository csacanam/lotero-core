import React from "react";
import Link from "next/link";
import { hardhat } from "viem/chains";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/outline";
import { Faucet } from "~~/components/scaffold-eth";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

/**
 * Site footer
 */
export const Footer = () => {
  const isLocalNetwork = getTargetNetwork().id === hardhat.id;

  return (
    <div className="w-full py-5 px-1">
      <div>
        <div className="flex justify-between items-center w-full p-4">
          <div className="flex flex-col md:flex-row gap-2">
            {isLocalNetwork && (
              <>
                <Faucet />
                <Link href="/blockexplorer" passHref className="btn btn-primary btn-sm font-normal normal-case gap-1">
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  <span>Block Explorer</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="w-full">
        <ul className="menu menu-horizontal w-full">
          <div className="flex justify-center items-center gap-2 text-sm w-full">
            <div className="flex justify-center items-center gap-2">
              <p className="m-0 text-center">
                Built with <HeartIcon className="inline-block h-4 w-4" /> by
              </p>
              <a
                className="flex justify-center items-center gap-1"
                href="https://twitter.com/camilosaka"
                target="_blank"
                rel="noreferrer"
              >
                <span className="link">camilosaka</span>
              </a>
            </div>
            <span>·</span>
            <div className="text-center">
              <a
                href="https://camilos-personal-organization.gitbook.io/lotero/"
                target="_blank"
                rel="noreferrer"
                className="link"
              >
                Docs
              </a>
            </div>
            <span>·</span>
            <div className="text-center">
              <a href="https://t.me/+4a-Lc7yiSJsxYjEx" target="_blank" rel="noreferrer" className="link">
                Support
              </a>
            </div>
          </div>
        </ul>
      </div>
    </div>
  );
};
