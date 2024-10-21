import { LoginStatus } from "@/layouts/constants";

export interface NavbarProps {
    scroll: number;
    toggleDarkMode: () => void;
    darkMode: boolean
    isLoggedIn: LoginStatus
    userData: any
    setIsLoggedIn: (state: LoginStatus) => void
    showToast: (type: string, msg: string) => void
}