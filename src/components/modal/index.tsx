import React, { FC } from "react";
import { ModalProps } from "./types";

const Modal: FC<ModalProps> = ({ children }) => {
    return (
        <div className="fixed inset-0 flex items-center justify-center z-10 w-full h-svh backdrop-blur-0 backdrop-blur-sm">
            <div className="relative flex items-center justify-center p-4 w-full max-w-md">
                {children}
            </div>
        </div>
    )
}

export default Modal