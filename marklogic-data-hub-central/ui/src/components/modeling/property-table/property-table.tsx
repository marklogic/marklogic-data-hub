import React, {useState, useEffect, useContext} from "react";
import {MLButton, MLTable, MLTooltip} from "@marklogic/design-system";
import {faCircle, faCheck, faTrashAlt, faPlusSquare} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import scrollIntoView from "scroll-into-view";
import useDeepCompareEffect from "use-deep-compare-effect";
import styles from "./property-table.module.scss";
import PropertyModal from "../property-modal/property-modal";
import ConfirmationModal from "../../confirmation-modal/confirmation-modal";

import {
  Definition,
  EntityDefinitionPayload,
  StructuredTypeOptions,
  EditPropertyOptions,
  PropertyOptions,
  PropertyType,
  EntityModified
} from "../../../types/modeling-types";
import {ConfirmationType} from "../../../types/common-types";

import {entityReferences} from "../../../api/modeling";
import {UserContext} from "../../../util/user-context";
import {ModelingContext} from "../../../util/modeling-context";
import {definitionsParser} from "../../../util/data-conversion";
import {ModelingTooltips} from "../../../config/tooltips.config";
import {getSystemInfo} from "../../../api/environment";

let CryptoJS = require("crypto-js");
let key = CryptoJS.lib.WordArray.random(16);
let iv = CryptoJS.lib.WordArray.random(16);

const encrypt = (text) => (CryptoJS.AES.encrypt(text, key, {
  mode: CryptoJS.mode.CTR,
  iv: iv,
  padding: CryptoJS.pad.NoPadding
})).ciphertext.toString();

type Props = {
  canReadEntityModel: boolean;
  canWriteEntityModel: boolean;
  entityName: string;
  definitions: any;
}

const DEFAULT_ENTITY_DEFINITION: Definition = {
  name: "",
  properties: []
};

const DEFAULT_STRUCTURED_TYPE_OPTIONS: StructuredTypeOptions = {
  isStructured: false,
  name: "",
  propertyName: ""
};

const DEFAULT_SELECTED_PROPERTY_OPTIONS: PropertyOptions = {
  propertyType: PropertyType.Basic,
  type: "",
  identifier: "no",
  joinPropertyName: "",
  joinPropertyType: "",
  multiple: "no",
  pii: "no",
  facetable: false,
  sortable: false
  //wildcard: false
};

const DEFAULT_EDIT_PROPERTY_OPTIONS: EditPropertyOptions = {
  name: "",
  isEdit: false,
  propertyOptions: DEFAULT_SELECTED_PROPERTY_OPTIONS
};

const PropertyTable: React.FC<Props> = (props) => {
  const {handleError} = useContext(UserContext);
  const {modelingOptions, updateEntityModified} = useContext(ModelingContext);
  const [showPropertyModal, toggleShowPropertyModal] = useState(false);

  const [editPropertyOptions, setEditPropertyOptions] = useState<EditPropertyOptions>(DEFAULT_EDIT_PROPERTY_OPTIONS);
  const [deletePropertyOptions, setDeletePropertyOptions] = useState({definitionName: "", propertyName: ""});

  const [structuredTypeOptions, setStructuredTypeOptions] = useState<StructuredTypeOptions>(DEFAULT_STRUCTURED_TYPE_OPTIONS);
  const [definitions, setDefinitions] = useState<any>({});
  const [entityDefinitionsArray, setEntityDefinitionsArray] = useState<Definition[]>([]);

  const [confirmType, setConfirmType] = useState<ConfirmationType>(ConfirmationType.Identifer);
  const [showConfirmModal, toggleConfirmModal] = useState(false);
  const [confirmBoldTextArray, setConfirmBoldTextArray] = useState<string[]>([]);
  const [stepValuesArray, setStepValuesArray] = useState<string[]>([]);

  const [headerColumns, setHeaderColumns] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [newRowKey, setNewRowKey] = useState("");

  useDeepCompareEffect(() => {
    updateEntityDefinitionsAndRenderTable(props.definitions);
  }, [props.definitions]);

  useEffect(() => {
    if (newRowKey) {
      let element = document.querySelector(`.${newRowKey}`);
      if (element) {
        scrollIntoView(element);
      }
    }
  }, [newRowKey]);

  const columns = [
    {
      title: "Property Name",
      dataIndex: "propertyName",
      width: 200,
      render: (text, record) => {
        let renderText = text;

        if (props.canWriteEntityModel && props.canReadEntityModel) {

          renderText = <span
            data-testid={text + "-span"}
            aria-label="property-name-header"
            className={styles.link}
            onClick={() => {
              editPropertyShowModal(text, record);
            }}>
            {text}</span>;
        }

        return renderText;
      }
    },
    {
      title: "Type",
      dataIndex: "type",
      width: 125
    },
    {
      title: (
        <MLTooltip title={ModelingTooltips.identifier}>
          <span aria-label="identifier-header">Identifier</span>
        </MLTooltip>
      ),
      dataIndex: "identifier",
      width: 100,
      render: text => {
        return text && <FontAwesomeIcon className={styles.identifierIcon} icon={faCircle} data-testid={"identifier-" + text} />;
      }
    },
    {
      title: (
        <MLTooltip title={ModelingTooltips.multiple}>
          <span aria-label="multiple-header">Multiple</span>
        </MLTooltip>
      ),
      dataIndex: "multiple",
      width: 100,
      render: text => {
        return text && <FontAwesomeIcon className={styles.multipleIcon} icon={faCheck} data-testid={"multiple-" + text} />;
      }
    },
    {
      title: (
        <MLTooltip title={ModelingTooltips.sort}>
          <span aria-label="sort-header">Sort</span>
        </MLTooltip>
      ),
      dataIndex: "sortable",
      width: 75,
      render: text => {
        return text && <FontAwesomeIcon className={styles.sortIcon} icon={faCheck} data-testid={"sort-" + text} />;
      }
    },
    {
      title: (
        <MLTooltip title={ModelingTooltips.facet}>
          <span aria-label="facet-header">Facet</span>
        </MLTooltip>
      ),
      dataIndex: "facetable",
      width: 100,
      render: text => {
        return text && <FontAwesomeIcon className={styles.facetIcon} icon={faCheck} data-testid={"facet-" + text} />;
      }
    },
    // {
    //   title: (
    //     <MLTooltip title={ModelingTooltips.wildcard}>
    //       <span aria-label="wildcard-header">Wildcard Search</span>
    //     </MLTooltip>
    //   ),
    //   dataIndex: 'wildcard',
    //   width: 150,
    //   render: (text) => {
    //     return text && <FontAwesomeIcon className={styles.wildcardIcon} icon={faCheck} data-testid={'wildcard-'+ text}/>
    //   }
    // },
    {
      title: (
        <MLTooltip title={ModelingTooltips.pii}>
          <span aria-label="pii-header">PII</span>
        </MLTooltip>
      ),
      dataIndex: "pii",
      width: 75,
      render: text => {
        return text && <FontAwesomeIcon className={styles.icon} icon={faCheck} data-testid={"pii-" + text} />;
      }
    },
    {
      title: "Delete",
      dataIndex: "delete",
      width: 75,
      render: (text, record) => {
        let definitionName = record.delete;

        if (record.hasOwnProperty("structured")) {
          if (record.structured === record.type) {
            let addArray = record.add.split(",");
            addArray = addArray.filter(item => item !== record.structured);
            addArray = addArray.filter(item => item !== record.propertyName);
            if (addArray.length > 0) {
              definitionName = addArray[0];
            }
          } else {
            definitionName = record.structured;
          }
        }
        let id = definitionName === text ? `delete-${text}-${record.propertyName}` : `delete-${text}-${definitionName}-${record.propertyName}`;

        return <FontAwesomeIcon className={!props.canWriteEntityModel && props.canReadEntityModel ? styles.iconTrashReadOnly : styles.iconTrash}
          icon={faTrashAlt}
          size="2x"
          data-testid={id}
          onClick={(event) => {
            if (!props.canWriteEntityModel && props.canReadEntityModel) {
              return event.preventDefault();
            } else {
              deletePropertyShowModal(text, record, definitionName);
            }
          }} />;
      }
    },
    {
      title: "Add",
      dataIndex: "add",
      width: 75,
      render: text => {
        let textParse = text && text.split(",");
        let structuredTypeName = Array.isArray(textParse) ? textParse[textParse.length - 1] : text;

        const addIcon = props.canWriteEntityModel ? (
          <MLTooltip title={ModelingTooltips.addStructuredProperty} placement="topRight">
            <FontAwesomeIcon
              data-testid={"add-struct-" + structuredTypeName}
              className={styles.addIcon}
              icon={faPlusSquare}
              onClick={() => {
                setStructuredTypeOptions({
                  isStructured: true,
                  name: text,
                  propertyName: ""
                });
                setEditPropertyOptions({...editPropertyOptions, isEdit: false});
                toggleShowPropertyModal(true);
              }}
            />
          </MLTooltip>
        ) : (
          <MLTooltip title={ModelingTooltips.addStructuredProperty + " " + ModelingTooltips.noWriteAccess} placement="topRight" overlayStyle={{maxWidth: "175px"}}>
            <FontAwesomeIcon
              data-testid={"add-struct-" + structuredTypeName} className={styles.addIconReadOnly}
              icon={faPlusSquare}
            />
          </MLTooltip>
        );

        return text && addIcon;
      }
    }
  ];

  const addPropertyButtonClicked = () => {

    toggleShowPropertyModal(true);
    setEditPropertyOptions({...editPropertyOptions, isEdit: false});
    setStructuredTypeOptions({...structuredTypeOptions, isStructured: false});
  };

  const updateEntityDefinitionsAndRenderTable = (definitions: Definition) => {
    let entityDefinitionsArray = definitionsParser(definitions);
    let renderTableData = parseDefinitionsToTable(entityDefinitionsArray);
    if (entityDefinitionsArray.length === 1) {
      setHeaderColumns(columns.slice(0, 8));
    } else if (entityDefinitionsArray.length > 1) {
      setHeaderColumns(columns);
    }
    // Expand structured type
    if (structuredTypeOptions.isStructured) {
      let row = renderTableData.find(row => row.propertyName === structuredTypeOptions.propertyName);
      if (!row) {
        let structuredNames = structuredTypeOptions.name.split(",").slice(1);
        row = renderTableData.find(row => row.type === structuredNames[0]);
        if (row) {
          let childRow = row["children"].find(childRow => childRow.type === structuredNames[1]);
          if (childRow && childRow.hasOwnProperty("key")) {
            setExpandedRows([row.key, childRow.key]);
          } else {
            setExpandedRows([row.key]);
          }
        }

      } else {
        setExpandedRows([row.key]);
      }
    }

    setDefinitions(definitions);
    setEntityDefinitionsArray(entityDefinitionsArray);
    setTableData(renderTableData);
  };

  const addStructuredTypeToDefinition = (structuredTypeName: string) => {
    let newStructuredType: EntityDefinitionPayload = {
      [structuredTypeName]: {
        properties: {}
      }
    };
    let newDefinitions = {...definitions, ...newStructuredType};
    let entityModified: EntityModified = {
      entityName: props.entityName,
      modelDefinition: newDefinitions
    };

    updateEntityModified(entityModified);
    updateEntityDefinitionsAndRenderTable(newDefinitions);
  };

  const createPropertyDefinitionPayload = (propertyOptions: PropertyOptions) => {
    let multiple = propertyOptions.multiple === "yes" ? true : false;
    let facetable = propertyOptions.facetable;
    let sortable = propertyOptions.sortable;

    if (propertyOptions.propertyType === PropertyType.RelatedEntity && !multiple) {
      let externalEntity = modelingOptions.entityTypeNamesArray.find(entity => entity.name === propertyOptions.type);
      return {
        datatype: propertyOptions.joinPropertyType,
        relatedEntityType: externalEntity.entityTypeId,
        joinPropertyName: propertyOptions.joinPropertyName,
        //joinPropertyType: propertyOptions.joinPropertyType
      };

    } else if (propertyOptions.propertyType === PropertyType.RelatedEntity && multiple) {
      let externalEntity = modelingOptions.entityTypeNamesArray.find(entity => entity.name === propertyOptions.type);
      return {
        datatype: "array",
        facetable: facetable,
        sortable: sortable,
        items: {
          datatype: propertyOptions.joinPropertyType,
          relatedEntityType: externalEntity.entityTypeId,
          joinPropertyName: propertyOptions.joinPropertyName,
          //joinPropertyType: propertyOptions.joinPropertyType
        }
      };

    } else if (propertyOptions.propertyType === PropertyType.Structured && !multiple) {
      return {
        $ref: "#/definitions/" + propertyOptions.type,
      };

    } else if (propertyOptions.propertyType === PropertyType.Structured && multiple) {
      return {
        datatype: "array",
        facetable: facetable,
        sortable: sortable,
        items: {
          $ref: "#/definitions/" + propertyOptions.type,
        }
      };

    } else if (propertyOptions.propertyType === PropertyType.Basic && multiple) {
      return {
        datatype: "array",
        facetable: facetable,
        sortable: sortable,
        items: {
          datatype: propertyOptions.type,
          collation: "http://marklogic.com/collation/codepoint",
        }
      };
    } else if (propertyOptions.propertyType === PropertyType.Basic && !multiple) {
      return {
        datatype: propertyOptions.type,
        facetable: facetable,
        sortable: sortable,
        collation: "http://marklogic.com/collation/codepoint"
      };
    }
  };
  // Covers both Entity Type and Structured Type
  const addPropertyToDefinition = (definitionName: string, propertyName: string, propertyOptions: PropertyOptions) => {
    let parseName = definitionName.split(",");
    let parseDefinitionName = parseName[parseName.length - 1];
    let updatedDefinitions = {...definitions};
    let entityTypeDefinition = updatedDefinitions[parseDefinitionName];
    let newProperty = createPropertyDefinitionPayload(propertyOptions);
    let newRowKey = "scroll-" + encrypt(props.entityName) + "-" + encrypt(propertyName);

    if (propertyOptions.identifier === "yes") {
      entityTypeDefinition["primaryKey"] = propertyName;
    }

    if (propertyOptions.pii === "yes") {
      if (entityTypeDefinition.hasOwnProperty("pii")) {
        entityTypeDefinition["pii"].push(propertyName);
      } else {
        entityTypeDefinition["pii"] = [propertyName];
      }
    }

    // if (propertyOptions.wildcard) {
    //   if (entityTypeDefinition.hasOwnProperty('wordLexicon')) {
    //     entityTypeDefinition['wordLexicon'].push(propertyName);
    //   } else {
    //     entityTypeDefinition['wordLexicon'] = [propertyName]
    //   }
    // } else if (!entityTypeDefinition.hasOwnProperty('wordLexicon')) {
    //   entityTypeDefinition['wordLexicon'] = []
    // }

    if (structuredTypeOptions.isStructured) {
      let structuredString = structuredTypeOptions.name.split(",").map(item => encrypt(item)).join("-");
      newRowKey = "scroll-" + encrypt(props.entityName) + "-" + structuredString;
    }

    entityTypeDefinition["properties"][propertyName] = newProperty;
    updatedDefinitions[parseDefinitionName] = entityTypeDefinition;

    let entityModified: EntityModified = {
      entityName: props.entityName,
      modelDefinition: updatedDefinitions
    };

    updateEntityModified(entityModified);
    updateEntityDefinitionsAndRenderTable(updatedDefinitions);
    setNewRowKey(newRowKey);
  };

  const editPropertyShowModal = (text: string, record: any) => {
    let parseKey = record.key.split(",");
    let propertyType = PropertyType.Basic;
    let newStructuredTypes: StructuredTypeOptions = DEFAULT_STRUCTURED_TYPE_OPTIONS;
    //let relationshipType = modelingOptions.entityTypeNamesArray.find(entity => entity.name === record.type);
    let relationshipType = record.joinPropertyName;

    if (record.hasOwnProperty("structured")) {
      if (record.hasOwnProperty("add")) {
        let parseAddRecord = record.add.split(",");
        parseAddRecord.shift();

        propertyType = PropertyType.Structured;
        newStructuredTypes.isStructured = true;
        newStructuredTypes.name = parseAddRecord[0];
        newStructuredTypes.propertyName = record.propertyName;

      } else if (record.type === record.structured) {
        propertyType = PropertyType.Structured;
        newStructuredTypes.isStructured = true;
        newStructuredTypes.name = record.structured;
        newStructuredTypes.propertyName = record.propertyName;
      } else {
        propertyType = PropertyType.Basic;
        newStructuredTypes.isStructured = true;
        newStructuredTypes.name = record.structured;
        newStructuredTypes.propertyName = parseKey[0];
      }

    } else if (relationshipType) {
      propertyType = PropertyType.RelatedEntity;
      newStructuredTypes.isStructured = false;
      newStructuredTypes.name = "";
      newStructuredTypes.propertyName = "";
    } else {
      newStructuredTypes.isStructured = false;
      newStructuredTypes.name = "";
      newStructuredTypes.propertyName = "";
    }

    const propertyOptions: PropertyOptions = {
      propertyType: propertyType,
      type: record.type,
      joinPropertyName: record.joinPropertyName,
      joinPropertyType: record.joinPropertyType,
      identifier: record.identifier ? "yes" : "no",
      multiple: record.multiple ? "yes" : "no",
      pii: record.pii ? "yes" : "no",
      facetable: record.facetable ? true : false,
      sortable: record.sortable ? true : false
      //wildcard: record.wildcard ? true : false
    };

    const editPropertyOptions: EditPropertyOptions = {
      name: text,
      isEdit: true,
      propertyOptions
    };
    setStructuredTypeOptions(newStructuredTypes);
    setEditPropertyOptions(editPropertyOptions);
    toggleShowPropertyModal(true);
  };

  const editPropertyUpdateDefinition = (definitionName: string, propertyName: string, editPropertyOptions: EditPropertyOptions) => {
    console.warn("editPropertyUpdateDefinition", editPropertyOptions);
    let parseName = definitionName.split(",");
    let parseDefinitionName = parseName[parseName.length - 1];
    let updatedDefinitions = {...definitions};
    let entityTypeDefinition = updatedDefinitions[parseDefinitionName];
    let newProperty = createPropertyDefinitionPayload(editPropertyOptions.propertyOptions);

    entityTypeDefinition["properties"][propertyName] = newProperty;

    if (editPropertyOptions.propertyOptions.identifier === "yes") {
      entityTypeDefinition.primaryKey = editPropertyOptions.name;
    } else if (entityTypeDefinition.hasOwnProperty("primaryKey") && entityTypeDefinition.primaryKey === propertyName) {
      delete entityTypeDefinition.primaryKey;
    }

    if (editPropertyOptions.propertyOptions.pii === "yes") {
      let index = entityTypeDefinition.pii?.indexOf(propertyName);
      if (index > -1) {
        entityTypeDefinition.pii[index] = editPropertyOptions.name;
      } else {
        if (entityTypeDefinition.hasOwnProperty("pii")) {
          entityTypeDefinition.pii.push(editPropertyOptions.name);
        } else {
          entityTypeDefinition.pii = [editPropertyOptions.name];
        }
      }
    } else {
      let index = entityTypeDefinition.pii?.indexOf(propertyName);
      if (index > -1) {
        entityTypeDefinition.pii.splice(index, 1);
      }
    }

    // if (editPropertyOptions.propertyOptions.wildcard) {
    //   let index = entityTypeDefinition.wordLexicon?.indexOf(propertyName);
    //   if (index > -1) {
    //     entityTypeDefinition.wordLexicon[index] = editPropertyOptions.name;
    //   } else {
    //     if (entityTypeDefinition.hasOwnProperty('wordLexicon')) {
    //       entityTypeDefinition.wordLexicon.push(editPropertyOptions.name);
    //     } else {
    //       entityTypeDefinition.wordLexicon = [editPropertyOptions.name];
    //     }      }
    // } else {
    //   let index = entityTypeDefinition.wordLexicon?.indexOf(propertyName);
    //   if (index > -1) {
    //     entityTypeDefinition.wordLexicon.splice(index, 1);
    //   }
    // }

    if (propertyName !== editPropertyOptions.name) {
      let reMapDefinition = Object.keys(entityTypeDefinition["properties"]).map((key) => {
        const newKey = key === propertyName ? editPropertyOptions.name : key;
        const value = key === propertyName ? newProperty : entityTypeDefinition["properties"][key];
        return {[newKey]: value};
      });
      entityTypeDefinition["properties"] = reMapDefinition.reduce((a, b) => Object.assign({}, a, b));

      if (entityTypeDefinition.hasOwnProperty("required") && entityTypeDefinition.required.some(value => value === propertyName)) {
        let index = entityTypeDefinition.required.indexOf(propertyName);
        entityTypeDefinition.required[index] = editPropertyOptions.name;
      }
      if (entityTypeDefinition.hasOwnProperty("rangeIndex") && entityTypeDefinition.rangeIndex.some(value => value === propertyName)) {
        let index = entityTypeDefinition.rangeIndex.indexOf(propertyName);
        entityTypeDefinition.rangeIndex[index] = editPropertyOptions.name;
      }
      if (entityTypeDefinition.hasOwnProperty("pathRangeIndex") && entityTypeDefinition.pathRangeIndex.some(value => value === propertyName)) {
        let index = entityTypeDefinition.pathRangeIndex.indexOf(propertyName);
        entityTypeDefinition.pathRangeIndex[index] = editPropertyOptions.name;
      }
      if (entityTypeDefinition.hasOwnProperty("elementRangeIndex") && entityTypeDefinition.elementRangeIndex.some(value => value === propertyName)) {
        let index = entityTypeDefinition.elementRangeIndex.indexOf(propertyName);
        entityTypeDefinition.elementRangeIndex[index] = editPropertyOptions.name;
      }
      if (entityTypeDefinition.hasOwnProperty("wordLexicon") && entityTypeDefinition.wordLexicon.some(value => value === propertyName)) {
        let index = entityTypeDefinition.wordLexicon.indexOf(propertyName);
        entityTypeDefinition.wordLexicon[index] = editPropertyOptions.name;
      }
    }

    updatedDefinitions[parseDefinitionName] = entityTypeDefinition;

    let entityModified: EntityModified = {
      entityName: props.entityName,
      modelDefinition: updatedDefinitions
    };

    updateEntityModified(entityModified);
    updateEntityDefinitionsAndRenderTable(updatedDefinitions);
  };

  const deletePropertyShowModal = async (text: string, record: any, definitionName: string) => {
    try {
      const response = await entityReferences(text);
      if (response["status"] === 200) {
        //let definitionName = record.delete;
        let newConfirmType = ConfirmationType.DeletePropertyWarn;
        let boldText: string[] = [record.propertyName];

        if (response["data"]["stepNames"].length > 0) {
          newConfirmType = ConfirmationType.DeletePropertyStepWarn;
          boldText.push(text);
        }

        setDeletePropertyOptions({definitionName: definitionName, propertyName: record.propertyName});
        setConfirmBoldTextArray(boldText);
        setStepValuesArray(response["data"]["stepNames"]);
        setConfirmType(newConfirmType);
        toggleConfirmModal(true);
      }
    } catch (error) {
      handleError(error);
    }
  };

  const deletePropertyFromDefinition = (definitionName: string, propertyName: string) => {
    let parseName = definitionName.split(",");
    let parseDefinitionName = parseName[parseName.length - 1];
    let updatedDefinitions = {...definitions};
    let entityTypeDefinition = updatedDefinitions[parseDefinitionName];

    if (entityTypeDefinition.hasOwnProperty("primaryKey") && entityTypeDefinition.primaryKey === propertyName) {
      delete entityTypeDefinition.primaryKey;
    }
    if (entityTypeDefinition.hasOwnProperty("wordLexicon") && entityTypeDefinition.wordLexicon.some(value => value === propertyName)) {
      let index = entityTypeDefinition.wordLexicon.indexOf(propertyName);
      entityTypeDefinition.wordLexicon.splice(index, 1);
    }
    if (entityTypeDefinition.hasOwnProperty("pii") && entityTypeDefinition.pii.some(value => value === propertyName)) {
      let index = entityTypeDefinition.pii.indexOf(propertyName);
      entityTypeDefinition.pii.splice(index, 1);
    }
    if (entityTypeDefinition.hasOwnProperty("required") && entityTypeDefinition.required.some(value => value === propertyName)) {
      let index = entityTypeDefinition.required.indexOf(propertyName);
      entityTypeDefinition.required.splice(index, 1);
    }
    if (entityTypeDefinition.hasOwnProperty("rangeIndex") && entityTypeDefinition.rangeIndex.some(value => value === propertyName)) {
      let index = entityTypeDefinition.rangeIndex.indexOf(propertyName);
      entityTypeDefinition.rangeIndex.splice(index, 1);
    }
    if (entityTypeDefinition.hasOwnProperty("pathRangeIndex") && entityTypeDefinition.pathRangeIndex.some(value => value === propertyName)) {
      let index = entityTypeDefinition.pathRangeIndex.indexOf(propertyName);
      entityTypeDefinition.pathRangeIndex.splice(index, 1);
    }
    if (entityTypeDefinition.hasOwnProperty("elementRangeIndex") && entityTypeDefinition.elementRangeIndex.some(value => value === propertyName)) {
      let index = entityTypeDefinition.elementRangeIndex.indexOf(propertyName);
      entityTypeDefinition.elementRangeIndex.splice(index, 1);
    }

    delete entityTypeDefinition["properties"][propertyName];
    updatedDefinitions[parseDefinitionName] = entityTypeDefinition;

    let entityModified: EntityModified = {
      entityName: props.entityName,
      modelDefinition: updatedDefinitions
    };

    updateEntityModified(entityModified);
    updateEntityDefinitionsAndRenderTable(updatedDefinitions);
  };

  const parseDefinitionsToTable = (entityDefinitionsArray: Definition[]) => {
    let entityTypeDefinition: Definition = entityDefinitionsArray.find(definition => definition.name === props.entityName) || DEFAULT_ENTITY_DEFINITION;
    return entityTypeDefinition?.properties.map((property, index) => {
      let propertyRow: any = {};
      let counter = 0;

      if (property.datatype === "structured") {
        const parseStructuredProperty = (entityDefinitionsArray, property, parentDefinitionName) => {
          let parsedRef = property.ref.split("/");
          if (parsedRef.length > 0 && parsedRef[1] === "definitions") {
            let structuredType = entityDefinitionsArray.find(entity => entity.name === parsedRef[2]);
            let structuredTypeProperties = structuredType?.properties.map((structProperty, structIndex) => {
              if (structProperty.datatype === "structured") {
                // Recursion to handle nested structured types
                counter++;
                let parentDefinitionName = structuredType.name;
                return parseStructuredProperty(entityDefinitionsArray, structProperty, parentDefinitionName);
              } else {
                return {
                  key: property.name + "," + index + structIndex + counter,
                  structured: structuredType.name,
                  propertyName: structProperty.name,
                  type: structProperty.datatype === "structured" ? structProperty.ref.split("/").pop() : structProperty.datatype,
                  identifier: entityTypeDefinition?.primaryKey === structProperty.name ? structProperty.name : "",
                  multiple: structProperty.multiple ? structProperty.name : "",
                  facetable: structProperty.facetable ? structProperty.name : "",
                  sortable: structProperty.sortable ? structProperty.name : "",
                  //wildcard: structuredType?.wordLexicon.some(value => value ===  structProperty.name) ? structProperty.name : '',
                  pii: structuredType?.pii?.some(value => value === structProperty.name) ? structProperty.name : "",
                  delete: entityTypeDefinition.name
                };
              }
            });

            let piiValue = entityTypeDefinition?.pii?.some(value => value === property.name) ? property.name : "";
            let addValue = property.name + "," + structuredType.name;

            if (parentDefinitionName) {
              let parentTypeDefinition: Definition = entityDefinitionsArray.find(definition => definition.name === parentDefinitionName) || DEFAULT_ENTITY_DEFINITION;
              piiValue = parentTypeDefinition?.pii?.some(value => value === property.name) ? property.name : "";
              addValue = property.name + "," + parentDefinitionName + "," + structuredType.name;
            }
            return {
              key: property.name + "," + index + counter,
              structured: structuredType.name,
              propertyName: property.name,
              multiple: property.multiple ? property.name : "",
              facetable: property.facetable ? property.name : "",
              sortable: property.sortable ? property.name : "",
              type: property.ref.split("/").pop(),
              pii: piiValue,
              children: structuredTypeProperties,
              add: addValue,
              delete: entityTypeDefinition.name
            };
          }
        };
        propertyRow = parseStructuredProperty(entityDefinitionsArray, property, "");
        counter++;
      } else {
        propertyRow = {
          key: property.name + "," + index,
          propertyName: property.name,
          type: property.datatype,
          joinPropertyName: property.joinPropertyName,
          joinPropertyType: property.joinPropertyType,
          identifier: entityTypeDefinition?.primaryKey === property.name ? property.name : "",
          multiple: property.multiple ? property.name : "",
          facetable: property.facetable ? property.name : "",
          sortable: property.sortable ? property.name : "",
          //wildcard: entityTypeDefinition?.wordLexicon.some( value => value === property.name) ? property.name : '',
          pii: entityTypeDefinition?.pii?.some(value => value === property.name) ? property.name : "",
          add: "",
          delete: entityTypeDefinition.name
        };
      }
      return propertyRow;
    });
  };

  const onExpand = (expanded, record) => {
    let newExpandedRows = [...expandedRows];
    if (expanded) {
      if (newExpandedRows.indexOf(record.key) === -1) {
        newExpandedRows.push(record.key);
      }
    } else {
      newExpandedRows = newExpandedRows.filter(row => row !== record.key);
    }
    setExpandedRows(newExpandedRows);
  };

  const confirmAction = async () => {
    if (confirmType === ConfirmationType.DeletePropertyWarn || confirmType === ConfirmationType.DeletePropertyStepWarn) {
      deletePropertyFromDefinition(deletePropertyOptions.definitionName, deletePropertyOptions.propertyName);
      toggleConfirmModal(false);
      setDeletePropertyOptions({definitionName: "", propertyName: ""});
      try {
        await getSystemInfo();
      } catch (error) {
        handleError(error);
      }
    }
  };

  const addPropertyButton = <MLButton
    type="primary"
    aria-label={props.entityName + "-add-property"}
    disabled={!props.canWriteEntityModel}
    className={!props.canWriteEntityModel && styles.disabledButton}
    onClick={() => addPropertyButtonClicked()}
  >Add Property</MLButton>;

  return (
    <div>
      <div className={styles.addButtonContainer}>
        {props.canWriteEntityModel ?
          <MLTooltip title={ModelingTooltips.addProperty}>
            <span>{addPropertyButton}</span>
          </MLTooltip>
          :
          <MLTooltip title={ModelingTooltips.addProperty + " " + ModelingTooltips.noWriteAccess}>
            <span>{addPropertyButton}</span>
          </MLTooltip>
        }
      </div>
      <PropertyModal
        entityName={props.entityName}
        entityDefinitionsArray={entityDefinitionsArray}
        isVisible={showPropertyModal}
        editPropertyOptions={editPropertyOptions}
        structuredTypeOptions={structuredTypeOptions}
        toggleModal={toggleShowPropertyModal}
        addPropertyToDefinition={addPropertyToDefinition}
        addStructuredTypeToDefinition={addStructuredTypeToDefinition}
        editPropertyUpdateDefinition={editPropertyUpdateDefinition}
        deletePropertyFromDefinition={deletePropertyFromDefinition}
      />
      <ConfirmationModal
        isVisible={showConfirmModal}
        type={confirmType}
        boldTextArray={confirmBoldTextArray}
        arrayValues={stepValuesArray}
        toggleModal={toggleConfirmModal}
        confirmAction={confirmAction}
      />
      <MLTable
        rowClassName={(record) => {
          let propertyName = record.hasOwnProperty("add") && record.add !== "" ? record.add.split(",").map(item => encrypt(item)).join("-") : encrypt(record.propertyName);
          return "scroll-" + encrypt(props.entityName) + "-" + propertyName;
        }}
        locale={{emptyText: " "}}
        columns={headerColumns}
        dataSource={tableData}
        onExpand={onExpand}
        expandedRowKeys={expandedRows}
        pagination={false}
      />
    </div>
  );
};

export default PropertyTable;
