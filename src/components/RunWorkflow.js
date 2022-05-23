import React, { useEffect, useState } from "react";
import validator from "validator";
import yaml from "js-yaml";
import { useNavigate } from "react-router-dom";

const RunWorkflow = ({ isLoggedIn }) => {
  const [workflow_type, set_workflow_type] = useState("CWL");
  const [workflow_version, set_workflow_version] = useState("v1.0");
  const [workflow_url, set_workflow_url] = useState("");
  const [workflow_url_error, set_workflow_url_error] = useState("");
  const [workflow_params, set_workflow_params] = useState("");
  const [workflow_params_error, set_workflow_params_error] = useState("");
  const [showAdvance, setShowAdvance] = useState(false);
  const [workflow_engine_params, set_workflow_engine_params] = useState("");
  const [workflow_engine_params_error, set_workflow_engine_params_error] = useState("");
  const [tags, setTags] = useState([]);
  let navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn === "false") {
      return navigate("/");
    }
  }, [isLoggedIn]);

  const handleTypeChange = (e) => {
    set_workflow_type(e.target.value);
    if (e.target.value === "CWL") {
      set_workflow_version("v1.0");
    } else if (e.target.value === "SMK") {
      set_workflow_version("DSL1");
    } else {
      set_workflow_version("<=6.10.0");
    }
  };

  const renderTags = () => {
    return (
      <>
        {tags.map((tag, i) => {
          return (
            <div className="flex my-2 items-center">
              <input type="string" id="workflow_params" value={tag.key} onChange={(e) => handleChangeTag(true, i, e)} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 mr-3" />
              <input type="string" id="workflow_params" value={tag.value} onChange={(e) => handleChangeTag(false, i, e)} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
              <span className="p-2.5 rounded-lg cursor-pointer" onClick={() => handleRemoveTag(i)}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </span>
            </div>
          );
        })}
      </>
    );
  };

  const handleChangeTag = (isKey, i, e) => {
    var tempTags = tags;
    if (isKey) {
      tempTags[i].key = e.target.value;
    } else {
      tempTags[i].value = e.target.value;
    }
    tempTags = [...tempTags];
    setTags(tempTags);
  };

  const handleAddTag = () => {
    var tempTags = tags;
    tempTags = [...tempTags, { key: "", value: "" }];
    setTags(tempTags);
  };

  const handleRemoveTag = (i) => {
    var tempTags = tags;
    tempTags.splice(i, 1);
    tempTags = [...tempTags];
    setTags(tempTags);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    set_workflow_url_error("");
    set_workflow_params_error("");
    set_workflow_engine_params_error("");
    if (workflow_url === "") {
      set_workflow_url_error("Workflow URL is required!");
      return;
    } else if (!validator.isURL(workflow_url)) {
      set_workflow_url_error("Workflow URL is not a valid URL!");
      return;
    }
    if (workflow_params === "") {
      set_workflow_params_error("Workflow parameters is required!");
      return;
    }
    var workflow_params_json = "";
    try {
      workflow_params_json = yaml.load(workflow_params);
    } catch (e) {
      set_workflow_params_error("Workflow parameters is not a valid YAML!");
      return;
    }
    workflow_params_json = JSON.stringify(workflow_params_json);
    var workflow_engine_params_json = "";
    if (workflow_engine_params !== "") {
      try {
        workflow_engine_params_json = yaml.load(workflow_engine_params);
      } catch (e) {
        set_workflow_engine_params_error("Workflow engine parameters is not a valid YAML!");
        return;
      }
    }
    workflow_engine_params_json = JSON.stringify(workflow_engine_params_json);
  };

  return (
    <div className="pt-36 md:px-32 px-10" style={{ transition: "all 0.5s" }}>
      <form>
        <div class="mb-6">
          {/* dark:text-gray-300 */}
          <label for="workflow_type" class="block mb-2 text-sm font-medium text-gray-900">
            Workflow type *
          </label>
          {/* dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 */}
          <select id="workflow_type" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" onChange={(e) => handleTypeChange(e)} value={workflow_type}>
            <option value="CWL">Common Workflow Language</option>
            <option value="SMK">Snakemake</option>
            <option value="NFL">Nextflow</option>
          </select>
        </div>
        <div class="mb-6">
          <label for="workflow_type_version" class="block mb-2 text-sm font-medium text-gray-900">
            Workflow type version *
          </label>
          {/* dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 */}
          <select id="workflow_type" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" onChange={(e) => set_workflow_version(e.target.value)} value={workflow_version}>
            {workflow_type === "CWL" ? (
              <>
                <option value="v1.0">v1.0</option>
              </>
            ) : workflow_type === "SMK" ? (
              <>
                <option value="DSL1">DSL1</option>
                <option value="DSL2">DSL2</option>
              </>
            ) : (
              <>
                <option value="<=6.10.0">=6.10.0</option>
              </>
            )}
          </select>
        </div>
        <div class="mb-6">
          <label for="workflow_url" class="block mb-2 text-sm font-medium text-gray-900">
            Workflow URL *
          </label>
          {/* dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 */}
          <input type="string" id="workflow_url" class={`bg-gray-50 border ${workflow_url_error === "" ? "border-gray-300" : "border-red-600"} text-gray-900 text-sm rounded-lg block w-full p-2.5`} onChange={(e) => set_workflow_url(e.target.value)} value={workflow_url} />
          {workflow_url_error !== "" ? <div className="text-red-600 text-xs p-1">{workflow_url_error}</div> : <></>}
        </div>{" "}
        <div class="mb-6">
          <label for="workflow_params" class="block mb-2 text-sm font-medium text-gray-900">
            Workflow parameters *
          </label>
          {/* dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 */}
          <textarea type="string" id="workflow_params" class={`bg-gray-50 border ${workflow_params_error === "" ? "border-gray-300" : "border-red-600"} text-gray-900 text-sm rounded-lg block w-full p-2.5`} onChange={(e) => set_workflow_params(e.target.value)} value={workflow_params} />
          {workflow_params_error !== "" ? <div className="text-red-600 text-xs p-1">{workflow_params_error}</div> : <></>}
        </div>
        <div>
          <div className="flex items-center justify-between border-b py-2 mb-5 cursor-pointer" onClick={() => setShowAdvance(!showAdvance)}>
            <div>Advance configurations</div>
            <div>
              {showAdvance ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
                </svg>
              )}
            </div>
          </div>
          {showAdvance ? (
            <>
              <div class={`mb-6 ${showAdvance ? "opacity-100" : "opacity-0"}`} style={{ transition: "all 0.5s" }}>
                <label for="workflow_engine_params" class="block mb-2 text-sm font-medium text-gray-900">
                  Workflow engine parameters
                </label>
                {/* dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 */}
                <textarea type="string" id="workflow_engine_params" class={`bg-gray-50 border ${workflow_engine_params_error === "" ? "border-gray-300" : "border-red-600"} text-gray-900 text-sm rounded-lg block w-full p-2.5`} value={workflow_engine_params} onChange={(e) => set_workflow_engine_params(e.target.value)} />
                {workflow_engine_params_error !== "" ? <div className="text-red-600 text-xs p-1">{workflow_engine_params_error}</div> : <></>}
              </div>
              <div class={`mb-6 text-gray-900 ${showAdvance ? "opacity-100" : "opacity-0"}`} style={{ transition: "all 0.5s" }}>
                <label for="tags" class="mb-2 text-sm font-medium text-gray-900 flex items-center justify-between">
                  Tags
                  <div className="text-white bg-green-400 hover:bg-green-600 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm md:w-auto pl-2 pr-3 py-1 text-center flex items-center cursor-pointer" onClick={() => handleAddTag()}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add
                  </div>
                </label>
                {/* dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 */}
                {tags.length === 0 ? (
                  <></>
                ) : (
                  <div className="text-sm rounded-lg w-full flex">
                    <div className="flex-1 mr-3 text-gray-900">Key</div>
                    <div className="flex-1 text-gray-900">Value</div>
                    <span className="px-2.5 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500 invisible" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </span>
                  </div>
                )}
                {renderTags()}
              </div>
            </>
          ) : (
            <></>
          )}
        </div>
        <button type="submit" class="text-white bg-color3 hover:bg-color3 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full md:w-auto px-5 py-2.5 text-center" onClick={(e) => handleSubmit(e)}>
          Submit
        </button>
      </form>
    </div>
  );
};
export default RunWorkflow;
