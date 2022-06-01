import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactJson from "react-json-view";
import { host_uri_wes } from "../config";

const Workflow = ({ isLoggedIn }) => {
  const navigate = useNavigate();
  const params = useParams();
  const { id } = params;
  const [workflow, setWorkflow] = useState(null);

  var token = localStorage.getItem("params");
  token = JSON.parse(token);
  token = token ? token.access_token : null;

  useEffect(() => {
    if (isLoggedIn === "false") {
      return navigate("/");
    }
  }, [isLoggedIn]);

  useEffect(() => {
    (async function fetchWorkflow() {
      const response = await fetch(`${host_uri_wes}/runs/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setWorkflow(data);
    })();
  }, [id]);

  if (workflow === null) {
    return (
      <div className="mt-32 w-screen">
        <div className="flex justify-center mt-5 font-semibold">
          <div className="flex w-48 items-center justify-between text-lg bg-white text-gray-700 text-center rounded-xl py-3 pl-7 pr-8 font-mons">
            <svg role="status" class="w-7 h-7 mr-2 text-gray-200 animate-spin fill-color3" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-36 md:px-32 px-10 font-open" style={{ transition: "all 0.5s" }}>
      <div className="mb-5">
        <div className="mb-2">Run ID</div>
        <div className="bg-100 text-xs block text-gray-900 font-mono w-full cursor-text rounded-lg p-3 bg-slate-100 tracking-wide">{id}</div>
      </div>
      <div className="mb-5">
        <div className="mb-2">Run State</div>
        <div className="bg-100 text-xs block text-gray-900 font-mono w-full cursor-text rounded-lg p-3 bg-slate-100 tracking-wide">{workflow.state}</div>
      </div>
      <div className="mb-5">
        <div className="mb-2">Run Request</div>
        {workflow === null ? (
          <div className="bg-100 text-xs block text-gray-900 font-mono w-full cursor-text rounded-lg p-3 bg-slate-100 tracking-wide">Loading...</div>
        ) : (
          <ReactJson src={workflow.request} collapsed={true} enableClipboard={false} displayObjectSize={false} displayDataTypes={false} style={{ backgroundColor: "#f1f5f9", borderRadius: "0.5rem", padding: "0.75rem", lineHeight: "1.2rem" }} className="rounded-lg" />
        )}
      </div>
      <div className="mb-5">
        <div className="mb-2">Run Outputs</div>
        {workflow === null ? (
          <div className="bg-100 text-xs block text-gray-900 font-mono w-full cursor-text rounded-lg p-3 bg-slate-100 tracking-wide">Loading...</div>
        ) : (
          <ReactJson src={workflow.outputs} collapsed={true} enableClipboard={false} displayObjectSize={false} displayDataTypes={false} style={{ backgroundColor: "#f1f5f9", borderRadius: "0.5rem", padding: "0.75rem", lineHeight: "1.2rem" }} className="rounded-lg" />
        )}
      </div>
      <div>
        <div className="mb-2">Run Logs</div>
        {workflow === null ? (
          <div className="bg-100 text-xs block text-gray-900 font-mono w-full cursor-text rounded-lg p-3 bg-slate-100 tracking-wide">Loading...</div>
        ) : (
          <ReactJson src={workflow.run_log} collapsed={true} enableClipboard={false} displayObjectSize={false} displayDataTypes={false} style={{ backgroundColor: "#f1f5f9", borderRadius: "0.5rem", padding: "0.75rem", lineHeight: "1.2rem" }} className="rounded-lg" />
        )}
      </div>
    </div>
  );
};

export default Workflow;
