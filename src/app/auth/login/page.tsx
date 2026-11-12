"use client";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function Page() {
    return (
        <div className="flex flex-col gap-4 justify-center items-center h-screen">
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
            <p className="text-sm text-muted-foreground">
                Before you log in, read what happens with your data:{" "}
                <Link
                    href="/privacy"
                    className="font-medium underline underline-offset-4"
                >
                    Privacy notice
                </Link>
            </p>
        </div>
    );
}

export default Page;
