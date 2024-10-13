import { LoginStatus } from "@/layouts/constants";

export interface TaskCreateProps {
    isLoggedIn: LoginStatus;
    showToast?: (type : string , msg : string) => void;
}