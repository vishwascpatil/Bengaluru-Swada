package com.bengaluruswada.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FusedLocationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
