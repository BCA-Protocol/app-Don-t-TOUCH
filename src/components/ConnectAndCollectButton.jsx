import { abi } from "@/resources/abi";
import { handleTaskCompletion, toggleCollecting,addPointsToUser } from "@/utils/utils";
import { ConnectKitButton } from "connectkit";
import { ConnectKitProvider } from "connectkit";
import { useEffect, useState, useRef } from "react";
import { useAccount, useReadContract, useWriteContract, useConnect } from "wagmi";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { formatLargeNumber } from "@/utils/helper";

const ConnectAndCollectButton = ({ userData }) => {
  const [address, setAddress] = useState(null);
  const {
    address: accountAddress,
    chain,
    chainId,
    connector,
    isConnected,
    isConnecting: walletIsConnecting,
  } = useAccount();
  const { connectors, connect, disconnect, connectedConnector } = useConnect();
  const contractAddress = process.env.NEXT_PUBLIC_SMART_CONTRACT_ADDRESS;
  const {
    writeContract,
    isLoading,
    isSuccess,
    error: theError,
    isError,
    isPending,
  } = useWriteContract();
  const prevAccountAddressRef = useRef();
  const [pendingTransaction, setPendingTransaction] = useState(false);
  const [blockPoints, setBlockPoints] = useState(0);

  const [methodStart, setMethodStart] = useState(false);
  const [methodStop, setMethodStop] = useState(false);
  const [userCollecting, setUserCollecting] = useState(userData.collecting);
  const [wallets, setWallets] = useState([]);


  const {
    data: readData,
    isSuccess: readSuccess,
    isError: readError,
    refetch: readRefetch,
  } = useReadContract({
    abi,
    address: contractAddress,
    functionName: "getUserPoints",
    args: [accountAddress],
    query: {
      enabled: false,
    },
  });

  useEffect(() => {
    if (readData && readSuccess) {
      setBlockPoints(readData);
    }
  }, [readData, readSuccess]);

    // Whenever Wagmi reports a new address (or no address)…
    useEffect(() => {
      if (address && chain) {
        // add it if not already in our list
        setWallets((prev) => {
          if (!prev.find((w) => w.address === address)) {
            const newWallet = { address, chainId: chain.id };
            // notify BCA immediately
            window.bca?.trackWallet(address, chain.id, {
              wallet_type: connectedConnector?.name || "unknown",
              connected_at: new Date().toISOString(),
            });
            return [...prev, newWallet];
          }
          return prev;
        });
      } else {
        // user disconnected: clear all or selectively remove
        setWallets([]);
      }
    }, [address, chain, connectedConnector]);

  // setTimeout(() => {
  //   // console.log("Refetching...");
  //   readRefetch();
  // }, 20000);

  // console.log("Method stop", methodStop);
  // console.log("Method start", methodStart);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (isConnected && userCollecting) {
        readRefetch();
        await addPointsToUser(userData.userId, 0.1, "Smart Cookie Connection", "cookiePoints")
        console.log('points added')
      }
    }, 20000);

    return () => clearInterval(intervalId);
  }, [isConnected ,readRefetch,userData.userId, userCollecting]);

  const doStartCollecting = () => {
    // console.log(methodStart, methodStop);
    if (methodStart || methodStop) return;
    setMethodStart(true);
    setPendingTransaction(true);
    writeContract({
      abi,
      address: contractAddress,
      functionName: "startDataCollection",
    });
  };

  const doStopCollecting = () => {
    if (methodStart || methodStop) return;
    setMethodStop(true);
    setPendingTransaction(true);
    writeContract({
      abi,
      address: contractAddress,
      functionName: "stopDataCollection",
    });
  };

  const connectKitOptions = {
    initialChainId: 0,
  };

  useEffect(() => {
    if (
      (prevAccountAddressRef.current === null ||
        prevAccountAddressRef.current === undefined) &&
      accountAddress
    ) {
      if (pendingTransaction !== true) {
        if (userCollecting === false) {
          console.log(
            "Wallet connected, attempting to generate cookie and register on the blockchain"
          );
          if (pendingTransaction !== true) {
            setPendingTransaction(true);
            console.log("Processing cookie generation...");
            setTimeout(() => doStartCollecting(), 500);
          }
        }
      }
    }
    prevAccountAddressRef.current = accountAddress;

    if (!blockPoints && accountAddress) {
      readRefetch();
    }

    // when the address is gone - user is disconnected, so set balance to 0
    if (!accountAddress) {
      setBlockPoints(0);
    }
  }, [accountAddress]);

  useEffect(() => {
    if (isPending) return;
    // console.log("Success, start, stop ", isSuccess, methodStart, methodStop);
    if (isSuccess) {
      if (methodStart) {
        // start collecting
        const handlePostStartCollecting = async () => {
          try {
            // the user may have generated the cookie earlier we may wanna start it
            console.log("Handling completion");
            const taskCompletion = await handleTaskCompletion(
              userData.userId,
              "generateCookie",
              {
                collecting: true,
                walletData: {
                  address: accountAddress ?? address ?? "unknown",
                  chain: chain?.name ?? "unknown",
                  chainId: chainId ?? "unknown",
                },
              }
            );
            // force collecting
            const { status, newUserData } = await toggleCollecting(
              userData.userId,
              true
            );
            if (status || taskCompletion) {
              setUserCollecting(true);
              const maxAge = new Date(
                "Fri, 31 Dec 9999 23:59:59 GMT"
              ).toUTCString();
              document.cookie = `BCAID=${encodeURIComponent(
                userData.userId
              )}; expires=${maxAge}; path=/; Secure; SameSite=None`;
            } else {
              console.log("Error generating cookie");
            }
            setPendingTransaction(false);
            setMethodStart(false);
          } catch (error) {
            console.error("Error generating cookie:", error);
          }
        };
        handlePostStartCollecting();
      }

      if (methodStop) {
        // stop collecting
        const handlePostStopCollecting = async () => {
          // remove our cookie
          const { status, newUserData } = await toggleCollecting(
            userData.userId,
            false
          );
          setUserCollecting(false);
          document.cookie =
            "BCAID=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; Secure; SameSite=None";
          setPendingTransaction(false);
          setMethodStop(false);
        };
        handlePostStopCollecting();
      }
    }

    if (theError !== undefined && theError !== null) {
      console.log("Cookie generation rejected by user", isError);
      setPendingTransaction(false);
      setMethodStart(false);
      setMethodStop(false);
      console.log(theError);
    }
  }, [isSuccess, isError, theError, isPending]);
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="p-1 text-base font-light text-center text-white">
        {isConnected && userCollecting ? (
          <>🎉 You are earning</>
        ) : (
          <span className="text-lg font-bold">Connect Browser and Earn</span>
        )}{" "}
      </div>
      {blockPoints > 0 && userCollecting && (
        <div className="pb-2 text-lg font-light text-center text-white">
          You have <strong>{formatLargeNumber(blockPoints.toString())}</strong>{" "}
          Browsing points
        </div>
      )}
      <div className="items-center justify-center text-center">
        {isLoading ? (
          <div className="text-lg text-white">Completing task...</div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full space-y-4">
            {isConnected && !userCollecting && (
              <div>
                <button
                  disabled={pendingTransaction === true}
                  className="min-h-10 py-1 text-base font-semibold px-2 text-white transition duration-500 ease-in-out transform cursor-pointer disabled:bg-[#383838] disabled:text-[#686868] bg-purple-700 rounded-lg hover:bg-purple-900"
                  onClick={doStartCollecting}
                >
                  Generate Smart Cookie
                </button>
                <p className="items-center justify-center py-1 text-xs text-center text-white">
                  *this will initiate a transaction
                </p>
              </div>
            )}
            {pendingTransaction ? (
              <div className="inline-flex items-center justify-center space-x-2 text-white">
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <p>Pending...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-1">
                <div disabled={pendingTransaction || walletIsConnecting}>
                  <ConnectKitProvider
                    onConnect={({ address }) => setAddress(address)}
                    onDisconnect={() => setAddress(null)}
                    options={connectKitOptions}
                  >
                    <ConnectKitButton
                      theme="default"
                      mode="auto"
                      label={
                        walletIsConnecting
                          ? "Connecting..."
                          : "Connect your wallet"
                      }
                      className="hover:-translate-y-1"
                    />
                  </ConnectKitProvider>
                </div>
                {!isConnected && (
                  <div className="flex flex-col pt-4">
                    <span className="text-xs text-gray-300">
                      * when you connect your wallet no transaction is executed
                    </span>
                    <span className="text-xs text-gray-300">
                      You can disconnect at any time
                    </span>
                  </div>
                )}

                {isConnected && userCollecting && (
                  <div className="cursor-pointer group z-10">
                    <button
                      disabled={pendingTransaction === true}
                      className="px-2 pt-2 text-sm text-purple-600 underline cursor-pointer group-hover:text-white"
                      onClick={doStopCollecting}
                    >
                      Disconnect and stop earning ℹ️
                    </button>
                    <div className="h-6">
                      <p className="items-center justify-center hidden text-xs text-center text-white group-hover:flex">
                        *this will initiate a transaction
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectAndCollectButton;