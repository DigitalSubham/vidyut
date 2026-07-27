import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../lib/auth-context";
import { SchoolCodeScreen } from "../screens/SchoolCodeScreen";
import { PhoneScreen } from "../screens/PhoneScreen";
import { OtpScreen } from "../screens/OtpScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { TeacherHomeScreen } from "../screens/TeacherHomeScreen";
import { ParentStudentHomeScreen } from "../screens/ParentStudentHomeScreen";
import type { AuthStackParamList, RoleStackParamList } from "./types";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RoleStack = createNativeStackNavigator<RoleStackParamList>();

/** Role-based routing (context/feature-specs/15b's scope #4) — picks the home screen from the JWT's roles claim. */
function homeTitleKeyForRoles(roles: string[]): "home.parent" | "home.teacher" | "home.staff" | "home.student" {
  if (roles.includes("PARENT")) return "home.parent";
  if (roles.includes("STUDENT")) return "home.student";
  if (roles.includes("TEACHER")) return "home.teacher";
  return "home.staff"; // OWNER/PRINCIPAL/ADMIN/ACCOUNTANT land on the same staff placeholder for now
}

export function RootNavigator() {
  const { isLoading, session, roles } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? (
        <RoleStack.Navigator screenOptions={{ headerShown: false }}>
          {roles.includes("TEACHER") ? (
            <RoleStack.Screen name="TeacherAttendance" component={TeacherHomeScreen} />
          ) : roles.includes("PARENT") || roles.includes("STUDENT") ? (
            <RoleStack.Screen name="ParentStudentHome" component={ParentStudentHomeScreen} />
          ) : (
            <RoleStack.Screen name="Home">
              {() => <HomeScreen titleKey={homeTitleKeyForRoles(roles)} />}
            </RoleStack.Screen>
          )}
        </RoleStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="SchoolCode" component={SchoolCodeScreen} />
          <AuthStack.Screen name="Phone" component={PhoneScreen} />
          <AuthStack.Screen name="Otp" component={OtpScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
