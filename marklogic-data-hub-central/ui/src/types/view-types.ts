export type ViewSettingsType = {
    load?: {
        page?: number,
        viewMode?: string,
        sortOrder?: {
            columnKey?: string,
            order?: string
        },
    },

    model?: {
        entityExpandedRows?: string[],
        propertyExpandedRows?: string[],
        sortOrder?: {
            columnKey?: string,
            order?: string
        },
    },
    curate?: {
        stepArtifact?: any,
        modelDefinition?: any,
        entityType?: string
    },
    run?: {
        openFlows?: string[],
    },
};
