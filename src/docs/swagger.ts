import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
    openapi: "3.0.0",

    info: {
        title: "QuantumCart Order Service API",
        version: "1.0.0",
        description:
            "REST API for creating and managing customer orders in the QuantumCart e-commerce platform."
    },

    servers: [
        {
            url: "http://localhost:8004",
            description: "Local development server"
        }
    ],

    tags: [
        {
            name: "Health",
            description: "Service health endpoints"
        },
        {
            name: "Orders",
            description:
                "Customer order creation and retrieval endpoints"
        }
    ],

    components: {
        securitySchemes: {
            UserIdHeader: {
                type: "apiKey",
                in: "header",
                name: "x-user-id",
                description:
                    "User identification header used by the current Order Service."
            }
        },

        schemas: {
            CreateCartOrderRequest: {
                type: "object",
                required: ["source"],
                properties: {
                    source: {
                        type: "string",
                        enum: ["CART"],
                        example: "CART"
                    }
                }
            },

            CreateBuyNowOrderRequest: {
                type: "object",
                required: [
                    "source",
                    "productId",
                    "quantity"
                ],
                properties: {
                    source: {
                        type: "string",
                        enum: ["BUY_NOW"],
                        example: "BUY_NOW"
                    },

                    productId: {
                        type: "string",
                        format: "uuid",
                        description:
                            "Product to purchase.",
                        example:
                            "83cb7256-2c66-44aa-90cf-49550570e925"
                    },

                    quantity: {
                        type: "integer",
                        minimum: 1,
                        description:
                            "Quantity of the product to purchase.",
                        example: 2
                    }
                }
            },

            OrderItem: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        format: "uuid",
                        example:
                            "4a6c7e12-5d4b-4d20-8d9f-123456789abc"
                    },

                    productId: {
                        type: "string",
                        format: "uuid",
                        example:
                            "83cb7256-2c66-44aa-90cf-49550570e925"
                    },

                    productName: {
                        type: "string",
                        example:
                            "Multi Category Product"
                    },

                    sku: {
                        type: "string",
                        example:
                            "MULTI-SKU-1787560139819"
                    },

                    quantity: {
                        type: "integer",
                        example: 2
                    },

                    unitPrice: {
                        type: "number",
                        format: "double",
                        example: 49999
                    },

                    lineTotal: {
                        type: "number",
                        format: "double",
                        example: 99998
                    }
                }
            },

            Order: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        format: "uuid",
                        example:
                            "b7f2c6d1-5e2a-4f72-9a91-123456789abc"
                    },

                    orderNumber: {
                        type: "string",
                        example:
                            "QC-1787560139-A1B2C3"
                    },

                    userId: {
                        type: "string",
                        format: "uuid",
                        example:
                            "f5f5e7f2-4e32-4a91-bb71-123456789abc"
                    },

                    status: {
                        type: "string",
                        enum: [
                            "PENDING_PAYMENT",
                            "CONFIRMED",
                            "CANCELLED"
                        ],
                        example: "PENDING_PAYMENT"
                    },

                    subtotal: {
                        type: "number",
                        format: "double",
                        example: 99998
                    },

                    total: {
                        type: "number",
                        format: "double",
                        example: 99998
                    },

                    createdAt: {
                        type: "string",
                        format: "date-time"
                    },

                    updatedAt: {
                        type: "string",
                        format: "date-time"
                    },

                    items: {
                        type: "array",
                        items: {
                            $ref:
                                "#/components/schemas/OrderItem"
                        }
                    }
                }
            },

            Pagination: {
                type: "object",
                properties: {
                    page: {
                        type: "integer",
                        example: 1
                    },

                    pageSize: {
                        type: "integer",
                        example: 20
                    },

                    totalItems: {
                        type: "integer",
                        example: 5
                    },

                    totalPages: {
                        type: "integer",
                        example: 1
                    }
                }
            },

            CreateOrderResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        example: true
                    },

                    data: {
                        $ref:
                            "#/components/schemas/Order"
                    }
                }
            },

            GetOrdersResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        example: true
                    },

                    data: {
                        type: "array",
                        items: {
                            $ref:
                                "#/components/schemas/Order"
                        }
                    },

                    pagination: {
                        $ref:
                            "#/components/schemas/Pagination"
                    }
                }
            },

            GetOrderResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        example: true
                    },

                    data: {
                        $ref:
                            "#/components/schemas/Order"
                    }
                }
            },

            ErrorResponse: {
                type: "object",
                properties: {
                    success: {
                        type: "boolean",
                        example: false
                    },

                    error: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                example:
                                    "Authentication required"
                            }
                        }
                    }
                }
            }
        }
    }
};

const options: swaggerJSDoc.Options = {
    definition: swaggerDefinition,

    apis: [
        "./src/routes/*.ts",
        "./src/app.ts"
    ],

    failOnErrors: true
};

export const swaggerSpec =
    swaggerJSDoc(options);