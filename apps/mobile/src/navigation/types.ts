export type AuthStackParamList = {
  SchoolCode: undefined;
  Phone: { tenantSlug: string };
  Otp: { tenantSlug: string; phone: string };
};

export type RoleStackParamList = {
  Home: undefined;
  TeacherAttendance: undefined;
  ParentStudentHome: undefined;
};
