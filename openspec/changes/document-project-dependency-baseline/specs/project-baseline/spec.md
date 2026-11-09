# Spec Delta

## Purpose

The project baseline gives contributors a verifiable description of the repository's purpose, structure, supported toolchain, dependency roles, and implementation status so planning reflects the checked-out project.

## ADDED Requirements

### Requirement: Project baseline reflects the checked-out repository

Project documentation SHALL describe project structure, toolchain, and available workflows using evidence from the current repository, and SHALL distinguish present, absent, and unverified components.

#### Scenario: Documentation describes a component

- **WHEN** a contributor consults the project baseline for a component or workflow
- **THEN** the baseline identifies the repository evidence for its existence and does not present absent or unverified functionality as implemented

#### Scenario: Repository structure changes

- **WHEN** a change adds, removes, or relocates a project entrypoint or workflow
- **THEN** the project baseline is updated in the same change or explicitly records why the documented baseline remains accurate

### Requirement: Dependency inventory distinguishes declarations from resolved state

The project baseline SHALL identify dependency manifests and package managers, classify direct dependencies by toolchain and declared purpose, and distinguish manifest declarations from lockfile resolution or successful execution.

#### Scenario: Dependency declarations change

- **WHEN** a direct dependency or its declared purpose changes
- **THEN** the dependency inventory reflects the manifest and identifies whether the lockfile was verified against it

#### Scenario: Manifest and lockfile disagree

- **WHEN** the dependency manifest and lockfile do not describe the same dependency state
- **THEN** the project baseline reports the mismatch without claiming that the declared dependency set is installed or validated
