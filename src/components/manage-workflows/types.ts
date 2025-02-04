import { LoginStatus } from "@/layouts/constants"

export interface ManageWorkflowsProps {
    showToast: (type : string , msg : string) => void
    isLoggedIn: LoginStatus
}