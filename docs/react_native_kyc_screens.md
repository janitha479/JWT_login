# React Native KYC Submission Screens

This document outlines the React Native screens needed for the KYC submission process in the worker app.

## 1. KYC Status Screen

This screen displays the current status of KYC verification and guides the worker on next steps.

```jsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getKYCStatus } from "../api/kycApi";

const KYCStatusScreen = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      setLoading(true);
      const result = await getKYCStatus();
      setStatus(result.data);
    } catch (err) {
      setError(err.message || "Failed to fetch KYC status");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity onPress={fetchKYCStatus} style={styles.button}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // KYC not submitted yet
  if (!status || status.status === "NOT_SUBMITTED") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Identity Verification Required</Text>
        <Text style={styles.description}>
          Please verify your identity to access all worker features.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("KYCSubmission")}
        >
          <Text style={styles.buttonText}>Start Verification</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // KYC submitted but pending verification
  if (status.verificationStatus === "PENDING") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verification In Progress</Text>
        <Text style={styles.description}>
          Your documents have been submitted and are being reviewed. This
          typically takes 1-3 business days.
        </Text>
        <Text style={styles.subtitle}>Submitted on:</Text>
        <Text>{new Date(status.createdAt).toLocaleDateString()}</Text>
      </View>
    );
  }

  // KYC rejected
  if (status.verificationStatus === "REJECTED") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verification Rejected</Text>
        <Text style={styles.subtitle}>Reason:</Text>
        <Text style={styles.description}>{status.rejectionReason}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("KYCSubmission")}
        >
          <Text style={styles.buttonText}>Submit Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // KYC verified
  return (
    <View style={styles.container}>
      <Text style={styles.titleSuccess}>Verification Successful</Text>
      <Text style={styles.description}>
        Your identity has been verified successfully. You have full access to
        all worker features.
      </Text>
      <Text style={styles.subtitle}>Verified on:</Text>
      <Text>{new Date(status.verifiedAt).toLocaleDateString()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  titleSuccess: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "green",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  error: {
    color: "red",
    marginBottom: 15,
    textAlign: "center",
  },
});

export default KYCStatusScreen;
```

## 2. KYC Submission Form Screen

This screen guides workers through the document submission process.

```jsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { submitKYC } from "../api/kycApi";
import { format } from "date-fns";

const KYCSubmissionScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  // Form state
  const [idType, setIdType] = useState("NATIONAL_ID");
  const [idNumber, setIdNumber] = useState("");

  // Date fields
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [expiryDateOpen, setExpiryDateOpen] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [dateOfBirthOpen, setDateOfBirthOpen] = useState(false);

  // Additional fields
  const [nationality, setNationality] = useState("");

  // Document images
  const [idFrontImage, setIdFrontImage] = useState(null);
  const [idBackImage, setIdBackImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [addressProofImage, setAddressProofImage] = useState(null);

  // Validation
  const [errors, setErrors] = useState({});

  // Pick an image from camera or gallery
  const pickImage = async (setter) => {
    try {
      // Ask for camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Camera permission is required to take photos"
        );
        return;
      }

      // Show action sheet for camera or gallery selection
      Alert.alert(
        "Choose Image Source",
        "Select where you want to pick the image from",
        [
          {
            text: "Camera",
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });

              if (!result.cancelled && result.assets && result.assets[0]) {
                setter(result.assets[0]);
              }
            },
          },
          {
            text: "Gallery",
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });

              if (!result.cancelled && result.assets && result.assets[0]) {
                setter(result.assets[0]);
              }
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
      console.error(error);
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!idType) newErrors.idType = "ID type is required";
    if (!idNumber) newErrors.idNumber = "ID number is required";
    if (!idFrontImage) newErrors.idFrontImage = "Front of ID is required";
    if (!selfieImage) newErrors.selfieImage = "Selfie is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert(
        "Missing Information",
        "Please fill all required fields and upload required documents"
      );
      return;
    }

    try {
      setLoading(true);

      // Create form data
      const formData = new FormData();
      formData.append("idType", idType);
      formData.append("idNumber", idNumber);
      formData.append("idExpiryDate", format(expiryDate, "yyyy-MM-dd"));
      formData.append("dateOfBirth", format(dateOfBirth, "yyyy-MM-dd"));
      formData.append("nationality", nationality);

      // Append images
      if (idFrontImage) {
        const localUri = idFrontImage.uri;
        const filename = localUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image";

        formData.append("idFront", {
          uri: localUri,
          name: filename,
          type,
        });
      }

      // Add other images similarly...
      if (idBackImage) {
        const localUri = idBackImage.uri;
        const filename = localUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image";

        formData.append("idBack", {
          uri: localUri,
          name: filename,
          type,
        });
      }

      if (selfieImage) {
        const localUri = selfieImage.uri;
        const filename = localUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image";

        formData.append("selfie", {
          uri: localUri,
          name: filename,
          type,
        });
      }

      if (addressProofImage) {
        const localUri = addressProofImage.uri;
        const filename = localUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image";

        formData.append("addressProof", {
          uri: localUri,
          name: filename,
          type,
        });
      }

      const response = await submitKYC(formData);

      Alert.alert(
        "Submission Successful",
        "Your identity documents have been submitted for verification. This process typically takes 1-3 business days.",
        [{ text: "OK", onPress: () => navigation.navigate("KYCStatus") }]
      );
    } catch (error) {
      console.error("KYC submission error:", error);
      Alert.alert(
        "Submission Failed",
        error.message || "Failed to submit your documents. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Uploading documents...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Identity Verification</Text>
      <Text style={styles.description}>
        Please provide your identification details and upload the required
        documents to verify your identity.
      </Text>

      {/* ID Type Selection */}
      <Text style={styles.label}>ID Type *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={idType}
          onValueChange={(value) => setIdType(value)}
          style={styles.picker}
        >
          <Picker.Item label="National ID" value="NATIONAL_ID" />
          <Picker.Item label="Passport" value="PASSPORT" />
          <Picker.Item label="Driver's License" value="DRIVERS_LICENSE" />
        </Picker>
      </View>
      {errors.idType && <Text style={styles.errorText}>{errors.idType}</Text>}

      {/* ID Number */}
      <Text style={styles.label}>ID Number *</Text>
      <TextInput
        style={styles.input}
        value={idNumber}
        onChangeText={setIdNumber}
        placeholder="Enter your ID number"
      />
      {errors.idNumber && (
        <Text style={styles.errorText}>{errors.idNumber}</Text>
      )}

      {/* Expiry Date */}
      <Text style={styles.label}>ID Expiry Date</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setExpiryDateOpen(true)}
      >
        <Text>{format(expiryDate, "dd/MM/yyyy")}</Text>
      </TouchableOpacity>
      {expiryDateOpen && (
        <DateTimePicker
          value={expiryDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setExpiryDateOpen(Platform.OS === "ios");
            if (selectedDate) setExpiryDate(selectedDate);
          }}
          minimumDate={new Date()}
        />
      )}

      {/* Date of Birth */}
      <Text style={styles.label}>Date of Birth</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setDateOfBirthOpen(true)}
      >
        <Text>{format(dateOfBirth, "dd/MM/yyyy")}</Text>
      </TouchableOpacity>
      {dateOfBirthOpen && (
        <DateTimePicker
          value={dateOfBirth}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setDateOfBirthOpen(Platform.OS === "ios");
            if (selectedDate) setDateOfBirth(selectedDate);
          }}
          maximumDate={new Date()}
        />
      )}

      {/* Nationality */}
      <Text style={styles.label}>Nationality</Text>
      <TextInput
        style={styles.input}
        value={nationality}
        onChangeText={setNationality}
        placeholder="Enter your nationality"
      />

      {/* ID Front Image Upload */}
      <Text style={styles.label}>Front of ID *</Text>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => pickImage(setIdFrontImage)}
      >
        {idFrontImage ? (
          <Image
            source={{ uri: idFrontImage.uri }}
            style={styles.previewImage}
          />
        ) : (
          <Text style={styles.uploadButtonText}>
            Take Photo or Select from Gallery
          </Text>
        )}
      </TouchableOpacity>
      {errors.idFrontImage && (
        <Text style={styles.errorText}>{errors.idFrontImage}</Text>
      )}

      {/* ID Back Image Upload */}
      <Text style={styles.label}>Back of ID</Text>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => pickImage(setIdBackImage)}
      >
        {idBackImage ? (
          <Image
            source={{ uri: idBackImage.uri }}
            style={styles.previewImage}
          />
        ) : (
          <Text style={styles.uploadButtonText}>
            Take Photo or Select from Gallery
          </Text>
        )}
      </TouchableOpacity>

      {/* Selfie Upload */}
      <Text style={styles.label}>Selfie with ID *</Text>
      <Text style={styles.hint}>
        Hold your ID next to your face and take a clear photo
      </Text>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => pickImage(setSelfieImage)}
      >
        {selfieImage ? (
          <Image
            source={{ uri: selfieImage.uri }}
            style={styles.previewImage}
          />
        ) : (
          <Text style={styles.uploadButtonText}>
            Take Photo or Select from Gallery
          </Text>
        )}
      </TouchableOpacity>
      {errors.selfieImage && (
        <Text style={styles.errorText}>{errors.selfieImage}</Text>
      )}

      {/* Address Proof Upload */}
      <Text style={styles.label}>Proof of Address (Optional)</Text>
      <Text style={styles.hint}>
        Utility bill, bank statement, etc. (not older than 3 months)
      </Text>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => pickImage(setAddressProofImage)}
      >
        {addressProofImage ? (
          <Image
            source={{ uri: addressProofImage.uri }}
            style={styles.previewImage}
          />
        ) : (
          <Text style={styles.uploadButtonText}>
            Take Photo or Select from Gallery
          </Text>
        )}
      </TouchableOpacity>

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit Documents</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 5,
  },
  hint: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 5,
    color: "#666",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    marginBottom: 10,
  },
  picker: {
    height: 50,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    height: 150,
  },
  uploadButtonText: {
    color: "#666",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 5,
  },
  submitButton: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 5,
  },
});

export default KYCSubmissionScreen;
```

## 3. API Client for KYC Services

Create this file to handle API calls related to KYC.

```jsx
// src/api/kycApi.js
import { apiClient } from "./apiClient";

// Get the current worker's KYC status
export const getKYCStatus = async () => {
  try {
    const response = await apiClient.get("/worker/kyc");
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Submit KYC documents
export const submitKYC = async (formData) => {
  try {
    const response = await apiClient.post("/worker/kyc", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

## 4. Update Navigation

Add the KYC screens to your navigation structure.

```jsx
// src/navigation/WorkerStack.js
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import WorkerHomeScreen from "../screens/WorkerHomeScreen";
import KYCStatusScreen from "../screens/KYCStatusScreen";
import KYCSubmissionScreen from "../screens/KYCSubmissionScreen";

const Stack = createStackNavigator();

const WorkerStack = () => {
  return (
    <Stack.Navigator initialRouteName="KYCStatus">
      <Stack.Screen
        name="WorkerHome"
        component={WorkerHomeScreen}
        options={{ title: "Dashboard" }}
      />
      <Stack.Screen
        name="KYCStatus"
        component={KYCStatusScreen}
        options={{ title: "Identity Verification" }}
      />
      <Stack.Screen
        name="KYCSubmission"
        component={KYCSubmissionScreen}
        options={{ title: "Submit Documents" }}
      />
    </Stack.Navigator>
  );
};

export default WorkerStack;
```

## 5. Package Dependencies

Add these packages to your React Native project:

```bash
npm install @react-native-picker/picker @react-native-community/datetimepicker expo-image-picker date-fns
# OR
yarn add @react-native-picker/picker @react-native-community/datetimepicker expo-image-picker date-fns
```
