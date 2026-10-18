import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Krini | Task and Workflow Execution",
    description: "Run tasks and workflows on selected registries",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html
            lang="en"
            className={cn(
                "h-full",
                "antialiased",
                geistSans.variable,
                geistMono.variable,
                "font-sans",
                inter.variable,
            )}
            suppressHydrationWarning>
            <body className="min-h-full flex flex-col">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange={false}>
                    <TooltipProvider>{children}</TooltipProvider>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
