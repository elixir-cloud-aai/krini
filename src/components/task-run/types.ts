import { LoginStatus } from "@/layouts/constants";

export interface TaskRunProps {
    isLoggedIn: LoginStatus;
    showToast?: (type : string , msg : string) => void;
}