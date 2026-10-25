import type {
    NextFunction,
    Request,
    Response
} from "express";

import {
    getOrderReportSummary,
    getOrderReportTimeseries,
    getOrderReportTopProducts
} from "../services/order-report.service";

import {
    parseBucket,
    parseDateRange
} from "../utils/date-range";

export const getOrderReportSummaryController = async (
    request: Request,
    response: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const range = parseDateRange(
            request.query.from,
            request.query.to
        );

        const data =
            await getOrderReportSummary(range);

        response.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const getOrderReportTimeseriesController = async (
    request: Request,
    response: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const range = parseDateRange(
            request.query.from,
            request.query.to
        );

        const bucket = parseBucket(
            request.query.bucket
        );

        const data =
            await getOrderReportTimeseries(
                range,
                bucket
            );

        response.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

export const getOrderReportTopProductsController = async (
    request: Request,
    response: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const range = parseDateRange(
            request.query.from,
            request.query.to
        );

        const data =
            await getOrderReportTopProducts(
                range,
                request.query.limit
            );

        response.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};
