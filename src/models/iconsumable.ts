"use strict";

/**
 * IConsumable interface.
 */
interface IConsumable {
    /**
     * Unique identifier.
     */
    id: string;
    /**
     * Geocoordinate latitude.
     */
    lat: number;
    /**
     * Geocoordinate longitude.
     */
    lon: number;
}

// Export interface.
export { IConsumable };