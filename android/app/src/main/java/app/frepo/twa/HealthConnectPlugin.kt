package app.frepo.twa

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneOffset
import java.time.Duration

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {
    
    private val TAG = "HealthConnectPlugin"
    private var healthConnectClient: HealthConnectClient? = null
    
    private val permissions = setOf(
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getWritePermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getWritePermission(TotalCaloriesBurnedRecord::class)
    )
    
    override fun load() {
        super.load()
        try {
            healthConnectClient = HealthConnectClient.getOrCreate(context)
            Log.d(TAG, "Health Connect client initialized")
        } catch (e: Exception) {
            Log.e(TAG, "Health Connect not available: ${e.message}")
        }
    }
    
    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val result = JSObject()
        val availabilityStatus = HealthConnectClient.getSdkStatus(context)
        result.put("available", availabilityStatus == HealthConnectClient.SDK_AVAILABLE)
        result.put("status", availabilityStatus)
        call.resolve(result)
    }
    
    @PluginMethod
    fun getHealthPermissions(call: PluginCall) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val client = healthConnectClient ?: run {
                    call.reject("Health Connect not available")
                    return@launch
                }
                
                val granted = client.permissionController.getGrantedPermissions()
                val hasAllPermissions = permissions.all { it in granted }
                
                val result = JSObject()
                result.put("granted", hasAllPermissions)
                result.put("grantedCount", granted.size)
                result.put("requiredCount", permissions.size)
                call.resolve(result)
            } catch (e: Exception) {
                call.reject("Error checking permissions: ${e.message}")
            }
        }
    }
    
    @PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        try {
            val client = healthConnectClient ?: run {
                call.reject("Health Connect not available")
                return
            }
            
            // Store the call to resolve later
            bridge.saveCall(call)
            
            // Request permissions - user will need to handle this in the activity
            val result = JSObject()
            result.put("message", "Please grant Health Connect permissions in the app settings")
            result.put("permissionsRequired", permissions.size)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Error requesting permissions: ${e.message}")
        }
    }
    
    @PluginMethod
    fun writeWorkout(call: PluginCall) {
        val title = call.getString("title") ?: "fRepo Workout"
        val startTimeMs = call.getLong("startTime") ?: System.currentTimeMillis() - 3600000
        val endTimeMs = call.getLong("endTime") ?: System.currentTimeMillis()
        val caloriesBurned = call.getDouble("calories") ?: 0.0
        val notes = call.getString("notes") ?: ""
        
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val client = healthConnectClient ?: run {
                    call.reject("Health Connect not available")
                    return@launch
                }
                
                val startTime = Instant.ofEpochMilli(startTimeMs)
                val endTime = Instant.ofEpochMilli(endTimeMs)
                
                // Create exercise session record
                val exerciseSession = ExerciseSessionRecord(
                    startTime = startTime,
                    startZoneOffset = ZoneOffset.systemDefault().rules.getOffset(startTime),
                    endTime = endTime,
                    endZoneOffset = ZoneOffset.systemDefault().rules.getOffset(endTime),
                    exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
                    title = title,
                    notes = notes
                )
                
                val records = mutableListOf<androidx.health.connect.client.records.Record>(exerciseSession)
                
                // Add calories if provided
                if (caloriesBurned > 0) {
                    val caloriesRecord = TotalCaloriesBurnedRecord(
                        startTime = startTime,
                        startZoneOffset = ZoneOffset.systemDefault().rules.getOffset(startTime),
                        endTime = endTime,
                        endZoneOffset = ZoneOffset.systemDefault().rules.getOffset(endTime),
                        energy = androidx.health.connect.client.units.Energy.kilocalories(caloriesBurned)
                    )
                    records.add(caloriesRecord)
                }
                
                // Insert records
                val response = client.insertRecords(records)
                
                val result = JSObject()
                result.put("success", true)
                result.put("recordIds", response.recordIdsList.joinToString(","))
                result.put("message", "Workout synced to Health Connect")
                call.resolve(result)
                
                Log.d(TAG, "Workout written successfully: $title")
            } catch (e: Exception) {
                Log.e(TAG, "Error writing workout: ${e.message}")
                call.reject("Error writing workout: ${e.message}")
            }
        }
    }
}
