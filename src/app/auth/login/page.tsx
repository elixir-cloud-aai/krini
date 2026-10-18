"use client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { toast } from "sonner";

function Page() {
    return (
        <div className="flex justify-center items-center h-screen">
            <Button
                className="cursor-pointer"
                size={"icon-lg"}
                variant={"link"}
                onClick={() => {
                    toast.loading("Redirecting to LS Login...");
                    window.location.href = "/auth/api/login-redirect";
                }}
            >
                <Image
                    src={"/ls-login-grey-wide.jpg"}
                    className={"max-w-80 h-auto"}
                    width={320}
                    height={71}
                    alt="ls-login-image"
                    loading="eager"
                />
            </Button>
        </div>
    );
}

export default Page;
