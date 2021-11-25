import React, {useContext, useState} from "react";
import styles from "./job-results-table-view.module.scss";
import {dateConverter, renderDuration} from "../../util/date-conversion";
import {Tooltip, Table} from "antd";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faColumns} from "@fortawesome/free-solid-svg-icons";
import "./job-results-table-view.scss";
import {MonitorContext} from "../../util/monitor-context";
import JobResponse from "../job-response/job-response";
import {CheckCircleFill, ClockFill, XCircleFill} from "react-bootstrap-icons";
import {HCButton, HCCheckbox, HCDivider, HCTooltip} from "@components/common";
import Popover from "react-bootstrap/Popover";
import {OverlayTrigger} from "react-bootstrap";

const JobResultsTableView = (props) => {
  const [popoverVisibility, setPopoverVisibility] = useState<boolean>(false);
  const [jobId, setJobId] = useState<string>("");
  const [openJobResponse, setOpenJobResponse] = useState<boolean>(false);

  const handleOpenJobResponse = (jobId) => {
    setJobId(jobId);
    setOpenJobResponse(true);
  };

  const handleCloseJobResponse = (jobId) => {
    setOpenJobResponse(false);
    setJobId("");
  };

  const {
    setMonitorSortOrder
  } = useContext(MonitorContext);
  let sorting = true;
  const columnOptionsLabel = {
    user: "User",
    flowName: "Flow Name",
  };

  const MANDATORY_HEADERS = [
    {
      title: "Job ID",
      dataIndex: "jobId",
      visible: true,
      width: 200,
      sortable: false,
      render: (jobId) => {
        return <><a onClick={() => handleOpenJobResponse(jobId)}>{jobId}</a></>;
      }
    },
    {
      title: "Step Name",
      dataIndex: "stepName",
      visible: true,
      width: 200,
      sortable: true,
    },
    {
      title: "Step Type",
      dataIndex: "stepDefinitionType",
      visible: true,
      width: 150,
      sortable: true
    },
    {
      title: "Status",
      dataIndex: "jobStatus",
      visible: true,
      width: 100,
      sortable: false,
      align: "center",
      render: (status) => {
        if (status === "running" || /^running/.test(status)) {
          return <>
            <HCTooltip text="Running" id="running-tooltip" placement="bottom">
              <ClockFill data-testid= "progress" style={{color: "#5B69AF"}}/>
            </HCTooltip>
          </>;

        } else if (status === "finished") {
          return <>
            <HCTooltip text="Completed Successfully" id="complete-success-tooltip" placement="bottom">
              <CheckCircleFill data-testid= "success" style={{color: "#389E0D"}}/>
            </HCTooltip>
          </>;
        } else {
          return <>
            <HCTooltip text="Completed With Errors" id="complete-errors-tooltip" placement="bottom">
              <XCircleFill data-testid= "error" style={{color: "#B32424"}}/>
            </HCTooltip>
          </>;
        }
      }
    },
    {
      title: "Entity",
      dataIndex: "entityName",
      visible: true,
      width: 100,
      sortable: true
    },
    {
      title: "Start Time",
      dataIndex: "startTime",
      visible: true,
      width: 150,
      sortable: true,
      render: ((startTime:string) => dateConverter(startTime))
    },
    {
      title: "Duration",
      dataIndex: "duration",
      visible: true,
      sortable: false,
      width: 100,
      render: ((duration:string) => renderDuration(duration))
    },
    {
      title: "Records Written",
      dataIndex: "successfulItemCount",
      visible: true,
      width: 150,
      sortable: false,
      align: "right",
    }
  ];

  const CONFIGURABLE_HEADERS = [
    {
      title: "User",
      dataIndex: "user",
      visible: true,
      width: 150,
      sortable: false
    },
    {
      title: "Flow Name",
      dataIndex: "flowName",
      visible: true,
      width: 150,
      sortable: false
    }
  ];

  const DEFAULT_JOB_RESULTS_HEADER = [...MANDATORY_HEADERS, ...CONFIGURABLE_HEADERS];
  const allColumnHeaders = DEFAULT_JOB_RESULTS_HEADER.map(item => (item.sortable ?{...item, sorter: (a, b, sortOrder) => {
    if (sorting === true) {
      setMonitorSortOrder(item.dataIndex, sortOrder);
      sorting = false;
    }
    return a-b; // DHFPROD-7711 MLTable -> Table
  }}: {...item}));

  const [currentColumnHeaders, setCurrentColumnHeaders] = useState(allColumnHeaders);
  const [checkedAttributes, setCheckedAttributes] = useState({
    "user": true,
    "flowName": true
  });
  const [previousCheckedAttributes, setPreviousCheckedAttributes] = useState({
    "user": true,
    "flowName": true
  });

  const onCancel = () => {
    setPopoverVisibility(false);
    setCheckedAttributes({...previousCheckedAttributes});
    setCurrentColumnHeaders(currentColumnHeaders);
  };

  const onApply = () => {
    const checkedColumns = CONFIGURABLE_HEADERS.filter(columnHeader => checkedAttributes[columnHeader.dataIndex]);
    const filteredColumns =  [...MANDATORY_HEADERS, ...checkedColumns];
    setCurrentColumnHeaders(filteredColumns);
    setPreviousCheckedAttributes({...checkedAttributes});
    setPopoverVisibility(false);
  };

  const handleColOptionsChecked =  (e) => {
    let obj = checkedAttributes;
    obj[e.target.value] = e.target.checked;
    setCheckedAttributes({...obj});
  };

  const content = (
    <Popover id={`popover-overview`} className={styles.popoverJobResults}>
      <Popover.Body>
        <div data-testid="column-selector-popover" className={styles.popover}>
          <div className={styles.content}>
            {Object.keys(checkedAttributes).map(attribute => (
              <div key={attribute} className={styles.DropdownMenuItem}>
                <HCCheckbox
                  id={`column-${attribute}-id`}
                  handleClick={handleColOptionsChecked}
                  value={attribute}
                  label={columnOptionsLabel[attribute]}
                  checked={checkedAttributes[attribute]}
                  dataTestId={`columnOptionsCheckBox-${attribute}`}/>
              </div>
            ))}
          </div>
          <footer>
            <HCDivider className={styles.divider} />
            <div className={styles.footer}>
              <div>
                <HCButton size="sm" variant="outline-light" onClick={onCancel} >Cancel</HCButton>
                <span>  </span>
                <HCButton variant="primary" size="sm" onClick={onApply} disabled={false} >Apply</HCButton>
              </div>
            </div>
          </footer>
        </div>
      </Popover.Body>
    </Popover>
  );


  return (
    <>
      <div className={styles.columnSelector} data-cy="column-selector">
        <div className={styles.fixedPopup}>
          <OverlayTrigger placement="left-start" overlay={content} trigger="click" show={popoverVisibility}>
            <Tooltip title="Select the columns to display." placement="topRight">
              <FontAwesomeIcon onClick={() => { setPopoverVisibility(true); }} className={styles.columnIcon} icon={faColumns} color="#5B69AF" size="lg" data-testid="column-selector-icon"/>
            </Tooltip>
          </OverlayTrigger>
        </div>
      </div>
      <div className={styles.tabular}>
        <Table bordered
          data-testid="job-result-table"
          rowKey="startTime"
          dataSource={props.data}
          pagination={false}
          columns={currentColumnHeaders}
        />
      </div>
      <JobResponse jobId={jobId} openJobResponse={openJobResponse} setOpenJobResponse={handleCloseJobResponse}/>
    </>
  );
};

export default JobResultsTableView;
