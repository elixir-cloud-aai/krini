import React from "react";
import { DarkModeProps } from "./types";


const DarkModeContext = React.createContext<DarkModeProps | null>(null);

export default DarkModeContext;