package com.bengaluruswada.app;

import android.Manifest;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;

import java.io.IOException;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(
    name = "FusedLocation",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        )
    }
)
public class FusedLocationPlugin extends Plugin {

    private FusedLocationProviderClient fusedClient;

    @Override
    public void load() {
        fusedClient = LocationServices.getFusedLocationProviderClient(getActivity());
    }

    @PluginMethod()
    public void getCurrentLocation(PluginCall call) {
        if (getPermissionState("location") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "locationPermissionCallback");
        } else {
            fetchLocation(call);
        }
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (getPermissionState("location") == com.getcapacitor.PermissionState.GRANTED) {
            fetchLocation(call);
        } else {
            call.reject("Location permission was denied");
        }
    }

    @SuppressWarnings("MissingPermission")
    private void fetchLocation(PluginCall call) {
        boolean highAccuracy = call.getBoolean("enableHighAccuracy", true);

        int priority = highAccuracy
            ? Priority.PRIORITY_HIGH_ACCURACY
            : Priority.PRIORITY_BALANCED_POWER_ACCURACY;

        CancellationTokenSource cancellationTokenSource = new CancellationTokenSource();

        fusedClient.getCurrentLocation(priority, cancellationTokenSource.getToken())
            .addOnSuccessListener(getActivity(), location -> {
                if (location != null) {
                    resolveWithLocation(call, location);
                } else {
                    // getCurrentLocation returned null, try getLastLocation as fallback
                    fetchLastKnownLocation(call);
                }
            })
            .addOnFailureListener(getActivity(), e -> {
                call.reject("Failed to get location: " + e.getMessage(), e);
            });
    }

    @SuppressWarnings("MissingPermission")
    private void fetchLastKnownLocation(PluginCall call) {
        fusedClient.getLastLocation()
            .addOnSuccessListener(getActivity(), location -> {
                if (location != null) {
                    resolveWithLocation(call, location);
                } else {
                    call.reject("Location unavailable. Please ensure GPS is enabled.");
                }
            })
            .addOnFailureListener(getActivity(), e -> {
                call.reject("Failed to get last location: " + e.getMessage(), e);
            });
    }

    /**
     * Resolve the plugin call with location data + reverse-geocoded area name via Android Geocoder.
     */
    private void resolveWithLocation(PluginCall call, Location location) {
        double latitude = location.getLatitude();
        double longitude = location.getLongitude();

        JSObject result = new JSObject();
        result.put("latitude", latitude);
        result.put("longitude", longitude);
        result.put("accuracy", location.getAccuracy());

        // Use Android Geocoder to get area name
        String areaName = getAreaNameFromGeocoder(latitude, longitude);
        result.put("areaName", areaName);

        call.resolve(result);
    }

    /**
     * Use Android's Geocoder to reverse-geocode coordinates into a human-readable area name
     * like "Koramangala", "Whitefield", etc.
     */
    private String getAreaNameFromGeocoder(double latitude, double longitude) {
        if (!Geocoder.isPresent()) {
            return "Bangalore";
        }

        Geocoder geocoder = new Geocoder(getContext(), Locale.getDefault());

        try {
            List<Address> addresses = geocoder.getFromLocation(latitude, longitude, 1);

            if (addresses != null && !addresses.isEmpty()) {
                Address address = addresses.get(0);

                // Try to get the most specific area/locality name
                // Priority: subLocality > locality > subAdminArea > adminArea
                String subLocality = address.getSubLocality();       // e.g. "Koramangala", "Whitefield"
                String locality = address.getLocality();              // e.g. "Bengaluru"
                String subAdminArea = address.getSubAdminArea();      // e.g. "Bangalore Urban"
                String featureName = address.getFeatureName();        // e.g. specific place name

                if (subLocality != null && !subLocality.isEmpty()) {
                    return subLocality;
                } else if (featureName != null && !featureName.isEmpty()
                           && !featureName.matches("\\d+")
                           && !featureName.equals(locality)) {
                    // Use feature name if it's not just a number or city name
                    return featureName;
                } else if (locality != null && !locality.isEmpty()) {
                    return locality;
                } else if (subAdminArea != null && !subAdminArea.isEmpty()) {
                    return subAdminArea;
                }

                return "Bangalore";
            }
        } catch (IOException e) {
            e.printStackTrace();
        }

        return "Bangalore";
    }
}
