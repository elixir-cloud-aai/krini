import { LoginStatus } from "@/layouts/constants"

export interface RunWorkflowProps {
    isLoggedIn: LoginStatus
    showToast: (type : string , msg : string) => void
}