import React, { useEffect, useState } from "react";
import validator from "validator";
import yaml from "js-yaml";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import CodeEditor from "@uiw/react-textarea-code-editor";
import Files from "react-files";
import Marquee from "react-fast-marquee";

const RunWorkflow = ({ isLoggedIn }) => {
  const [workflow_type, set_workflow_type] = useState("CWL");
  const [workflow_version, set_workflow_version] = useState("v1.0");
  const [workflow_url, set_workflow_url] = useState("");
  const [workflow_url_error, set_workflow_url_error] = useState("");
  const [workflow_params, set_workflow_params] = useState("");
  const [workflow_params_error, set_workflow_params_error] = useState("");
  const [workflow_attachments, set_workflow_attachments] = useState([]);
  const [workflow_attachments_error, set_workflow_attachments_error] = useState("");
  const [showAdvance, setShowAdvance] = useState(false);
  const [workflow_engine_params, set_workflow_engine_params] = useState("");
  const [workflow_engine_params_error, set_workflow_engine_params_error] = useState("");
  const [tags, setTags] = useState([]);
  const [tags_error, set_tags_error] = useState([]);
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
            <>
              <div className="flex my-2 items-center">
                <input type="string" id="workflow_params" value={tag.key} onChange={(e) => handleChangeTag(true, i, e)} class="bg-gray-100 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 mr-3" placeholder="Please enter a key." />
                <input type="string" id="workflow_params" value={tag.value} onChange={(e) => handleChangeTag(false, i, e)} class="bg-gray-100 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="Please enter a value." />
                <span className="p-2.5 rounded-lg cursor-pointer" onClick={() => handleRemoveTag(i)}>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </span>
              </div>
              {tags_error[i] !== "" ? <div className="text-red-600 text-xs p-1">{tags_error[i]}</div> : <></>}
            </>
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
    set_tags_error([...tags_error, ""]);
  };

  const handleRemoveTag = (i) => {
    var tempTags = tags;
    tempTags.splice(i, 1);
    tempTags = [...tempTags];
    setTags(tempTags);
    tempTags = tags_error;
    tempTags.splice(i, 1);
    tempTags = [...tempTags];
    set_tags_error(tempTags);
  };

  const handleAttachmentChange = (e) => {
    var tempAttachment = [...workflow_attachments, ...e];
    set_workflow_attachments(tempAttachment);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    set_workflow_url_error("");
    set_workflow_params_error("");
    set_workflow_engine_params_error("");
    set_workflow_attachments_error("");

    const formData = new FormData();
    formData.append("workflow_type", workflow_type);
    formData.append("workflow_type_version", workflow_version);

    // workflow_url
    if (workflow_url === "") {
      set_workflow_url_error("Workflow URL is required!");
      return;
    } else if (!validator.isURL(workflow_url)) {
      set_workflow_url_error("Workflow URL is not a valid URL!");
      return;
    }
    formData.append("workflow_url", workflow_url);
    // workflow_url end

    // workflow_params
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
    formData.append("workflow_params", workflow_params_json);
    // workflow_params end

    // workflow_attachment
    if (workflow_attachments.length > 20) {
      set_workflow_attachments_error("Workflow attachments must be less that 20.");
      return;
    }
    var i = 0;
    for (const item of workflow_attachments) {
      if (item.size / 1000 > 500) {
        set_workflow_attachments_error("Workflow attachments must be less that 500 KB.");
        return;
      } else {
        formData.append(`workflow_attachment[${i}]`, item);
      }
      i++;
    }
    // workflow_attachment end

    // workflow_engine_params
    var workflow_engine_params_json = "";
    if (workflow_engine_params !== "") {
      try {
        workflow_engine_params_json = yaml.load(workflow_engine_params);
      } catch (e) {
        showAdvance(true);
        set_workflow_engine_params_error("Workflow engine parameters is not a valid YAML!");
        return;
      }
    }
    workflow_engine_params_json = JSON.stringify(workflow_engine_params_json);
    formData.append("workflow_engine_parameters", workflow_engine_params_json);
    // workflow_engine_params end

    //workflow_tag
    var tags_json = {};
    for (let i = 0; i < tags.length; i++) {
      if (tags[i].key === "") {
        var temp_tags_error = Array.from({ length: tags.length }, (v, k) => "");
        temp_tags_error[i] = "Tag key is required!";
        showAdvance(true);
        set_tags_error(temp_tags_error);
        return;
      }
      if (tags[i].value === "") {
        temp_tags_error = Array.from({ length: tags.length }, (v, k) => "");
        temp_tags_error[i] = "Tag value is required!";
        showAdvance(true);
        set_tags_error(temp_tags_error);
        return;
      }
      temp_tags_error = Array.from({ length: tags.length }, (v, k) => "");
      set_tags_error(temp_tags_error);
      tags_json = Object.assign(...tags.map((tag) => ({ [tag.key]: tag.value })));
    }
    tags_json = JSON.stringify(tags_json);
    formData.append("tags", tags_json);
    //workflow_tag end

    try {
      const res = await axios.post("https://wes.rahtiapp.fi/ga4gh/wes/v1/runs", formData, {
        headers: {
          "content-type": "multipart/form-data",
          Accept: "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
      });
      console.log(res);
    } catch (e) {
      console.log(e);
    }
  };

  const handleFileRemove = (i) => {
    var tempAttachment = workflow_attachments;
    tempAttachment.splice(i, 1);
    set_workflow_attachments([...tempAttachment]);
  };

  const handleFileRemoveAll = () => {
    set_workflow_attachments([]);
  };

  const renderFiles = () => {
    if (workflow_attachments.length <= 0) {
      return;
    }
    return (
      <div className="w-full bg-gray-100 rounded-lg p-3 text-xs mt-3 relative">
        <ul className="flex flex-wrap">
          {workflow_attachments.map((file, i) => (
            <li className="w-36 mr-5 relative" key={file.id}>
              <div className="h-20 flex items-center justify-center text-center w-full">
                {file.preview.type === "image" ? (
                  <img className="h-20" src={file.preview.url} />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 flex-1 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col items-center">
                <Marquee gradient={false} className="bg-gray-100 text-gray-900" pauseOnHover={true}>
                  <div className="bg-gray-100 text-gray-900">{file.name + "     "}</div>
                </Marquee>
                <div className="text-xs text-gray-700">{file.sizeReadable}</div>
              </div>
              <div
                id={file.id}
                className="absolute top-0 right-0 m-2 cursor-pointer rounded-full bg-white p-1 items-center justify-between"
                onClick={() => handleFileRemove(i)} // eslint-disable-line
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </li>
          ))}
        </ul>
        <div
          className="absolute cursor-pointer rounded-full bg-red-500 text-white p-1 flex items-center justify-between pr-1.5"
          style={{
            top: "-5px",
            right: "-5px",
          }}
          onClick={() => handleFileRemoveAll()} // eslint-disable-line
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear All
        </div>
      </div>
    );
  };

  if (isLoggedIn === "loading") {
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
    <div className="pt-36 md:px-32 px-10" style={{ transition: "all 0.5s" }}>
      <form>
        <div class="mb-6">
          {/* dark:text-gray-300 */}
          <label for="workflow_type" class="block mb-2 text-sm font-medium text-gray-900">
            Workflow type *
          </label>
          {/* dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 */}
          <select id="workflow_type" class="bg-gray-100 text-gray-900 text-sm rounded-lg block w-full p-2.5" onChange={(e) => handleTypeChange(e)} value={workflow_type}>
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
          <select id="workflow_type" class="bg-gray-100 text-gray-900 text-sm rounded-lg block w-full p-2.5" onChange={(e) => set_workflow_version(e.target.value)} value={workflow_version}>
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
                <option value="<=6.10.0">&lt;=6.10.0</option>
              </>
            )}
          </select>
        </div>
        <div class="mb-6">
          <label for="workflow_url" class="block mb-2 text-sm font-medium text-gray-900">
            Workflow URL *
          </label>
          {/* dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 */}
          <input type="string" id="workflow_url" class={`bg-gray-100 ${workflow_url_error === "" ? "" : "border border-red-600"} text-gray-900 text-sm rounded-lg block w-full p-2.5`} onChange={(e) => set_workflow_url(e.target.value)} value={workflow_url} placeholder="Please enter valid URL." />
          {workflow_url_error !== "" ? <div className="text-red-600 text-xs p-1">{workflow_url_error}</div> : <></>}
        </div>{" "}
        <div class="mb-6">
          <label for="workflow_params" class="block mb-2 text-sm font-medium text-gray-900">
            Workflow parameters *
          </label>
          {/* dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 */}
          <CodeEditor
            value={workflow_params}
            language="yaml"
            placeholder="Please enter YAML/JSON."
            onChange={(evn) => set_workflow_params(evn.target.value)}
            padding={15}
            style={{
              fontFamily: "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
            }}
            className={`${workflow_params_error === "" ? "" : "border border-red-600"} bg-100 rounded-lg text-xs w-full block text-gray-900`}
          />
          {workflow_params_error !== "" ? <div className="text-red-600 text-xs p-1">{workflow_params_error}</div> : <></>}
        </div>
        <div class="mb-6">
          <label for="workflow_attachments" class="block mb-2 text-sm font-medium text-gray-900">
            Workflow attachments
            {/* onError={this.onFilesError} */}
            <Files className="files-dropzone" onChange={(e) => handleAttachmentChange(e)} accepts={["image/png", ".pdf"]} multiple maxFileSize={10000000} minFileSize={0} clickable>
              <div className="text-white bg-green-400 hover:bg-green-600 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm pl-4 pr-4 py-2 mt-1.5 text-center flex items-center justify-center cursor-pointer w-full md:w-36">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload files
              </div>
            </Files>
            {renderFiles()}
            {workflow_attachments_error !== "" ? <div className="text-red-600 text-xs pl-0 p-1">{workflow_attachments_error}</div> : <></>}
          </label>
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
                <CodeEditor
                  value={workflow_engine_params}
                  language="yaml"
                  placeholder="Please enter YAML/JSON."
                  onChange={(evn) => set_workflow_engine_params(evn.target.value)}
                  padding={15}
                  style={{
                    fontFamily: "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
                  }}
                  className={`${workflow_engine_params_error === "" ? "" : "border border-red-600"} rounded-lg text-xs w-full block text-gray-900`}
                />
                {/* <textarea type="string" id="workflow_engine_params" class={`bg-gray-50 border ${workflow_engine_params_error === "" ? "border-gray-300" : "border-red-600"} text-gray-900 text-sm rounded-lg block w-full p-2.5`} value={workflow_engine_params} onChange={(e) => set_workflow_engine_params(e.target.value)} /> */}
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
