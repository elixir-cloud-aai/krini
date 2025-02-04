import axios from 'axios';
import React, { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HOST_URI_WES } from '@/config/constants';
import { ManageWorkflowsProps } from './types';
import { LoginStatus } from '@/layouts/constants';


const ManageWorkflows: FC<ManageWorkflowsProps> = ({ isLoggedIn, showToast }) => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<any[] | null>(null);
  const [query, setQuery] = useState('');


  useEffect(() => {
    if (isLoggedIn === LoginStatus.NOT_LOGGED_IN) {
      return navigate('/');
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    (async function fetchWorkflows() {
      try {
        const res = await axios.get(`${HOST_URI_WES}/runs`);
        setWorkflows(res.data);
        // setNextToken(res.data.next_page_token);
      } catch (e) {
        console.log(e);
        showToast('error', 'Server error!');
      }
      // setInterval(handleRefresh, 5000);
    })();
  }, [showToast]);

  // const handleRefresh = async () => {
  //   if (workflows === null) return;
  //   try {
  //     const res = await axios.get(`${host_uri_wes}/runs`, {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });
  //     let tempWorkflows = workflows;
  //     console.log(workflows, tempWorkflows, res.data);
  //     // if (tempWorkflows[0].run_id !== res.data.runs[0].run_id) {
  //     //   tempWorkflows.unshift(res.data.runs[0]);
  //     // }
  //     // setWorkflows(tempWorkflows);
  //   } catch (e) {
  //     showToast("error", "Server error!");
  //   }
  // };

  // const loadMore = async () => {
  //   setLoading(true);
  //   try {
  //     const res = await axios.get(`${host_uri_wes}/runs?${nextToken !== "" ? "page_token=" + nextToken : ""}`, {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });
  //     setWorkflows([...workflows, ...res.data.runs]);
  //     setNextToken(res.data.next_page_token);
  //   } catch (error) {
  //     showToast("error", "Server error!");
  //   }
  //   setLoading(false);
  // };
  // console.log(workflows);

  // const fetchWorkflow = async (id) => {
  //   try {
  //     const res = await axios.get(`${host_uri_wes}/runs/${id}`, {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });
  //     let tempworkflows = workflows;
  //     let index = tempworkflows.findIndex((workflow) => workflow.id === id);
  //     tempworkflows[index]. =
  //     return res.data;
  //   } catch (error) {
  //     showToast("error", "Server error!");
  //   }
  // };

  const renderRuns = () => {
    if (workflows === null || workflows === undefined) {
      return <div></div>;
    } else if (Array.isArray(workflows) &&  Array.from(workflows).length === 0) {
      return <div></div>;
    } else {
      return (
        <tbody>
          {workflows.map((workflow, i) =>
            query === '' || workflow.run_id.includes(query) ? (
              <tr
                key={workflow.run_id}
                className="bg-white border-t transition duration-100 ease-in-out hover:bg-gray-100 cursor-pointer"
                onClick={() => navigate(`/manage/${workflow.run_id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sm:hidden">
                  {i + 1}
                </td>
                <td className="text-sm text-gray-900 px-6 py-4 whitespace-nowrap">
                  {workflow.run_id}
                </td>
                <td className="text-sm text-gray-900 px-6 py-4 whitespace-nowrap">
                  {workflow.run_status}
                </td>
              </tr>
            ) : (
              <></>
            )
          )}
        </tbody>
      );
    }
  };

  return (
    <div
      className="pt-36 md:px-32 px-10 font-open"
      style={{ transition: 'all 0.5s' }}
    >
      <div className="border rounded-lg px-5 pt-3">
        <input
          type="search"
          className="border w-full rounded-lg text-sm py-1 px-3 outline-none"
          placeholder="Search by run id.."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        ></input>
        <div className="overflow-x-auto">
          <table className="table-auto min-w-full">
            <thead className="bg-white">
              <tr>
                <th
                  scope="col"
                  className="text-sm font-medium text-gray-900 px-6 py-4 text-left sm:hidden"
                >
                  #
                </th>
                <th
                  scope="col"
                  className="text-sm font-medium text-gray-900 px-6 py-4 text-left"
                >
                  Run ID
                </th>
                <th
                  scope="col"
                  className="text-sm font-medium text-gray-900 px-6 py-4 text-left"
                >
                  Run Status
                </th>
              </tr>
            </thead>
            {renderRuns()}
          </table>
        </div>
        {workflows === null ? (
          <div className="flex w-full items-center justify-center bg-white rounded-xl py-3">
            <svg
              role="status"
              className="w-7 h-7 mr-2 text-gray-200 animate-spin fill-color3"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
          </div>
        ) : workflows.length === 0 ? (
          <p className="flex w-full items-center justify-center bg-white rounded-xl py-3 text-gray-900 font-open">
            No workflows found
          </p>
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
};
export default ManageWorkflows;
